const emitNotificationCountToUser = async (io, userId, Notification) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: userId,
      read: false,
    });

    io.to(`user:${userId}`).emit("notification:counts-updated", { unreadCount });
  } catch (err) {
    console.error("Error emitting notification count:", err);
  }
};

module.exports = { emitNotificationCountToUser };