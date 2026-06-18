const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Companion = require("../models/Companion");
const { protect: auth } = require("../middleware/authMiddleware");

// Get or create conversation with a companion
router.post("/open/:userId", auth, async (req, res) => {
  try {
    // Only companions can chat
    const companionship = await Companion.findOne({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id },
      ],
      status: "accepted",
    });
    if (!companionship)
      return res.status(403).json({ message: "You can only chat with companions" });

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, req.params.userId] },
    }).populate("participants", "username profile_pic");

    // Create if doesn't exist
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, req.params.userId],
      });
      await conversation.populate("participants", "username profile_pic");
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all conversations for current user
router.get("/", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "username profile_pic");

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get messages for a conversation
router.get("/:conversationId/messages", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    // Make sure user is a participant
    if (!conversation.participants.includes(req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username profile_pic");

    // Mark messages as read
    await Message.updateMany(
      { conversation: req.params.conversationId, sender: { $ne: req.user.id }, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send message (HTTP fallback, Socket.io will handle real-time)
router.post("/:conversationId/messages", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Message text required" });

    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.includes(req.user.id))
      return res.status(403).json({ message: "Not authorized" });

    const message = await Message.create({
      conversation: req.params.conversationId,
      sender: req.user.id,
      text,
    });

    // Update conversation's last message
    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate("sender", "username profile_pic");
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;