const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

// Get my notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate("sender", "username profile_pic")
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark one as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { returnDocument: "after" }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete one
router.delete("/:id", protect, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Clear all
router.delete("/", protect, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: "Cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all as read
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;