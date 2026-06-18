const express = require("express");
const router = express.Router();
const Companion = require("../models/Companion");
const User = require("../models/User");
const { protect: auth } = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");


// GET /api/companions/search?q=username
router.get("/search", auth, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const users = await User.find({
      username: { $regex: q, $options: "i" },
      _id: { $ne: req.user.id },
      role: { $ne: "guide" },
    })
      .select("username profile_pic")
      .limit(8);

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/companions/pending
router.get("/pending", auth, async (req, res) => {
  try {
    const pending = await Companion.find({
      receiver: req.user.id,
      status: "pending",
    }).populate("sender", "username profile_pic");
    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/companions/status/:userId
router.get("/status/:userId", auth, async (req, res) => {
  try {
    const companion = await Companion.findOne({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
    });
    if (!companion) return res.json({ status: "none" });
    res.json({
      status: companion.status,
      isSender: companion.sender.toString() === req.user.id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET / (catch-all list — must come AFTER specific GET routes) ──────────────

// GET /api/companions
router.get("/", auth, async (req, res) => {
  try {
    const companions = await Companion.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: "accepted",
    })
      .populate("sender", "username profile_pic")
      .populate("receiver", "username profile_pic");

    const result = companions.map((c) => {
      const other =
        c.sender._id.toString() === req.user.id ? c.receiver : c.sender;
      return { companionshipId: c._id, user: other };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MUTATION ROUTES ───────────────────────────────────────────────────────────

// POST /api/companions/request/:userId
router.post("/request/:userId", auth, async (req, res) => {
  try {
    const receiver = await User.findById(req.params.userId);
    if (!receiver) return res.status(404).json({ message: "User not found" });
    if (receiver.role === "guide")
      return res.status(403).json({ message: "Cannot add guides as companions" });
    if (req.params.userId === req.user.id)
      return res.status(400).json({ message: "Cannot add yourself" });

    const existing = await Companion.findOne({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
    });
    if (existing)
      return res.status(400).json({ message: "Request already exists" });

    const companion = await Companion.create({
      sender: req.user.id,
      receiver: req.params.userId,
    });

    const newNotif = await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "request",
      message: `${req.user.username} sent you a companion request`,
      link: `/user/${req.user.id}`,
    });
    const io = req.app.get("io");
    const populated = await newNotif.populate("sender", "username profile_pic");
    io.sendNotification(req.params.userId, populated);

    res.status(201).json(companion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/companions/accept/:userId
router.post("/accept/:userId", auth, async (req, res) => {
  try {
    const companion = await Companion.findOne({
      sender: req.params.userId,
      receiver: req.user.id,
      status: "pending",
    });
    if (!companion)
      return res.status(404).json({ message: "Request not found" });

    companion.status = "accepted";
    await companion.save();

    const newNotif = await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "request",
      message: `${req.user.username} accepted your companion request`,
      link: `/user/${req.user.id}`,
    });
    const io = req.app.get("io");
    const populated = await newNotif.populate("sender", "username profile_pic");
    io.sendNotification(req.params.userId, populated);

    res.json(companion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/companions/reject/:userId
router.post("/reject/:userId", auth, async (req, res) => {
  try {
    const companion = await Companion.findOne({
      sender: req.params.userId,
      receiver: req.user.id,
      status: "pending",
    });
    if (!companion)
      return res.status(404).json({ message: "Request not found" });

    await companion.deleteOne();
    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/companions/cancel/:userId
router.delete("/cancel/:userId", auth, async (req, res) => {
  try {
    await Companion.findOneAndDelete({
      sender: req.user.id,
      receiver: req.params.userId,
      status: "pending",
    });

    const deleted = await Notification.findOneAndDelete({
      sender: req.user.id,
      recipient: req.params.userId,
      type: "request",
    });

    if (deleted) {
      const io = req.app.get("io");
      io.removeNotification(req.params.userId, deleted._id.toString());
      await io.emitCounts(req.params.userId);
    }

    res.json({ message: "Request cancelled" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/companions/remove/:userId
router.delete("/remove/:userId", auth, async (req, res) => {
  try {
    await Companion.findOneAndDelete({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
    });

    const deleted = await Notification.findOneAndDelete({
      sender: req.user.id,
      recipient: req.params.userId,
      type: "request",
    });

    if (deleted) {
      const io = req.app.get("io");
      io.removeNotification(req.params.userId, deleted._id.toString());
      await io.emitCounts(req.params.userId);
    }

    res.json({ message: "Companion removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;