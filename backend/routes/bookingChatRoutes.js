const express = require("express");
const router = express.Router();
const BookingChat = require("../models/BookingChat");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");
const { emitNotificationCountToUser } = require("../utils/socketHelper");

// Send message or share contact for a booking
router.post("/:bookingId/message", protect, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { message, phoneNumber, isPhoneShare } = req.body;

    console.log("📤 [POST /message] bookingId:", bookingId);

    // Validate booking exists
    const booking = await Booking.findById(bookingId).populate(["userId", "guideId"]);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Determine sender and receiver
    let senderId = req.user._id;
    let receiverId;

    // Check if user is guide or traveler
    const isGuide = booking.guideId.userId.toString() === req.user._id.toString();
    const isTraveler = booking.userId._id.toString() === req.user._id.toString();

    if (!isGuide && !isTraveler) {
      return res.status(403).json({ message: "Not part of this booking" });
    }

    receiverId = isGuide ? booking.userId._id : booking.guideId.userId;

    // Validate phone number if required (guide must provide on first message)
    const existingMessages = await BookingChat.findOne({ bookingId, senderId: req.user._id });
    if (isGuide && !phoneNumber && !existingMessages) {
      return res.status(400).json({ message: "Guide must share contact number on first message" });
    }

    // Create message
    const chat = new BookingChat({
      bookingId,
      senderId,
      receiverId,
      message: message || "",
      phoneNumber: phoneNumber || null, 
      isPhoneShare: isPhoneShare || false,
    });

    await chat.save();
    await chat.populate("senderId", "username profile_pic fullName");
    await chat.populate("receiverId", "username profile_pic fullName");

    console.log("✅ Message saved:", chat._id);

    // Emit socket notification to booking room (both users will get it)
    const io = req.app.get("io");
    if (io) {
      console.log("📢 Broadcasting to booking room:", `booking:${bookingId}`);
      
      io.to(`booking:${bookingId}`).emit("booking:message", {
        bookingId,
        chat,
      });

      // Also create a notification for the receiver
      const notification = new Notification({
        userId: receiverId,
        type: "booking_message",
        title: `New message from ${chat.senderId.username || "Guide"}`,
        message: message || "Shared contact number",
        relatedId: bookingId,
        read: false,
      });
      await notification.save();

      io.sendNotification(receiverId, {
        type: "booking_message",
        title: `New message from ${chat.senderId.username}`,
        message: message || "Shared contact number",
        relatedId: bookingId,
      });
      
      // Emit updated unread notification count
      await emitNotificationCountToUser(io, receiverId, Notification);
    }

    res.status(201).json(chat);
  } catch (error) {
    console.error("❌ Booking chat error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Fetch all messages for a booking
router.get("/:bookingId/messages", protect, async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Validate booking exists and user is part of it
    const booking = await Booking.findById(bookingId).populate(["userId", "guideId"]);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isGuide = booking.guideId.userId.toString() === req.user._id.toString();
    const isTraveler = booking.userId._id.toString() === req.user._id.toString();

    if (!isGuide && !isTraveler) {
      return res.status(403).json({ message: "Not part of this booking" });
    }

    // Fetch all messages for this booking
    const messages = await BookingChat.find({ bookingId })
      .populate("senderId", "username profile_pic fullName")
      .populate("receiverId", "username profile_pic fullName")
      .sort({ createdAt: 1 });

    console.log(`📥 Fetched ${messages.length} messages for booking ${bookingId}`);

    // Mark all messages where user is receiver as read
    await BookingChat.updateMany(
      { bookingId, receiverId: req.user._id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get latest message summary for a booking (for list view)
router.get("/:bookingId/latest", protect, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const latest = await BookingChat.findOne({ bookingId })
      .sort({ createdAt: -1 })
      .populate("senderId", "username profile_pic")
      .populate("receiverId", "username profile_pic");

    res.json(latest || {});
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all messages as read for a booking
router.patch("/:bookingId/read", protect, async (req, res) => {
  try {
    const { bookingId } = req.params;

    await BookingChat.updateMany(
      { bookingId, receiverId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "Marked as read" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;