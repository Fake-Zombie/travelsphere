const Message = require("./models/Message");
const Conversation = require("./models/Conversation");
const Companion = require("./models/Companion");
const Notification = require("./models/Notification");

const onlineUsers = new Map(); // userId → socketId

module.exports = (io) => {
  io.on("connection", (socket) => {

    // ── PRESENCE ──────────────────────────────────────────
    socket.on("user:online", async (userId) => {
      onlineUsers.set(String(userId), socket.id);
      io.emit("users:online", Array.from(onlineUsers.keys()));

      try {
        const [pendingCount, unreadCount] = await Promise.all([
          Companion.countDocuments({ receiver: userId, status: "pending" }),
          Notification.countDocuments({ userId: userId, read: false }),
        ]);
        setTimeout(() => {
          socket.emit("user:counts", { pendingCount, unreadCount });
        }, 100);
      } catch (err) {
        console.error("user:counts error:", err.message);
      }
    });

    // ── JOIN CONVERSATION ROOM ─────────────────────────────
    socket.on("chat:join", (conversationId) => {
      socket.join(conversationId);
    });

    // ── SEND MESSAGE ───────────────────────────────────────
    socket.on("chat:message", async ({ conversationId, senderId, text }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Save to DB
        const message = await Message.create({
          conversation: conversationId,
          sender: senderId,
          text,
        });
        await message.populate("sender", "username profile_pic");

        conversation.lastMessage = text;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        io.to(conversationId).emit("chat:message", message);

        const recipientId = conversation.participants
          .find((p) => p.toString() !== senderId)
          ?.toString();

        if (recipientId) {
          const recipientSocketId = onlineUsers.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit("chat:newMessage", {
              conversationId,
              message,
            });
          }
        }
      } catch (err) {
        console.error("chat:message error:", err.message);
      }
    });

    // ── TYPING INDICATOR ──────────────────────────────────
    socket.on("chat:typing", ({ conversationId, userId, username }) => {
      socket.to(conversationId).emit("chat:typing", { userId, username });
    });

    socket.on("chat:stopTyping", ({ conversationId }) => {
      socket.to(conversationId).emit("chat:stopTyping");
    });

    // ── BOOKING CHAT ROOM ──────────────────────────────────
    socket.on("booking:join", (bookingId) => {
      socket.join(`booking:${bookingId}`);
      console.log(`User joined booking room: booking:${bookingId}`);
    });

    socket.on("booking:leave", (bookingId) => {
      socket.leave(`booking:${bookingId}`);
    });

    // ── DISCONNECT ────────────────────────────────────────
    socket.on("disconnect", () => {
      for (const [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          io.emit("users:online", Array.from(onlineUsers.keys()));
          break;
        }
      }
    });
  });

  // Notification helper used by routes
  io.sendNotification = (recipientId, notification) => {
    const sockId = onlineUsers.get(String(recipientId));
    console.log(`[socket] sendNotification → recipientId: ${recipientId}, sockId: ${sockId}, onlineUsers:`, Array.from(onlineUsers.keys()));
    if (sockId) io.to(sockId).emit("notification:new", notification);
  };

  io.removeNotification = (recipientId, notificationId) => {
    const sockId = onlineUsers.get(String(recipientId));
    console.log(`[socket] removeNotification → recipientId: ${recipientId}, sockId: ${sockId}, notificationId: ${notificationId}`);
    if (sockId) io.to(sockId).emit("notification:remove", notificationId);
  };

  io.emitCounts = async (userId) => {
    try {
      const [pendingCount, unreadCount] = await Promise.all([
        Companion.countDocuments({ receiver: userId, status: "pending" }),
        Notification.countDocuments({ userId: userId, read: false }),
      ]);

      const sockId = onlineUsers.get(String(userId));
      if (sockId) {
        io.to(sockId).emit("user:counts", { pendingCount, unreadCount });
      }
    } catch (err) {
      console.error("emitCounts error:", err.message);
    }
  };

};