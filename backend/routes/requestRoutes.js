const express = require("express");
const router = express.Router();
const Request = require("../models/Request");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// User: submit a request
router.post("/", protect, async (req, res) => {
  try {
    const { subject, category, message } = req.body;
    const user = await User.findById(req.user._id);
    const request = await Request.create({ user: req.user._id, subject, category, message });

    // Notify all admins
    const admins = await User.find({ role: "admin" }).select("_id");
    await Notification.insertMany(
  admins.map(admin => ({
    userId: admin._id,
    message: `${user.username} submitted a new request: "${subject}"`,
    type: "request",
    link: "/admin"
  }))
);

    res.status(201).json(request);
  } catch (err) {
  console.log("REQUEST ERROR:", err);

  res.status(500).json({
    message: err.message,
    error: err,
  });
}
});

// User: get own requests
router.get("/my", protect, async (req, res) => {
  try {
    const requests = await Request.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: get all requests
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: update status
router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { returnDocument: "after" }
    ).populate("user", "username email");

    await Notification.create({
      userId: request.user._id,
      message: `Your request "${request.subject}" has been marked as ${req.body.status}.`,
      type: "request",
      link: "/requests"
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: send reply
router.post("/:id/reply", protect, adminOnly, async (req, res) => {
  try {
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { adminReply: req.body.reply, repliedAt: new Date(), status: "reviewed" },
      { returnDocument: "after" }
    ).populate("user", "username email");

    await Notification.create({
      userId: request.user._id,
      message: `Admin replied to your request: "${request.subject}"`,
      type: "request",
      link: "/requests"
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;