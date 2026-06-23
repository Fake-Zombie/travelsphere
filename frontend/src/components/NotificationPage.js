import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/notification.css";
import { useSocket } from "../context/SocketContext";

function NotificationPage({ setNotificationsCount }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const { socket } = useSocket();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const loadAndMarkRead = async () => {
      await fetchNotifications();
      await markAllRead();
    };

    loadAndMarkRead();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNew = (notification) => {
      setNotifications(prev => {
        const exists = prev.some(n => n._id.toString() === notification._id.toString());
        if (exists) return prev;
        return [notification, ...prev];
      });
      setNotificationsCount(prev => prev + 1);
    };

    const handleRemove = (notificationId) => {
      setNotifications(prev => {
        const updated = prev.filter(
          n => n._id.toString() !== notificationId.toString()
        );
        setNotificationsCount(updated.filter(n => !n.read).length);
        return updated;
      });
    };

    socket.on("notification:new", handleNew);
    socket.on("notification:remove", handleRemove);
    return () => {
      socket.off("notification:new", handleNew);
      socket.off("notification:remove", handleRemove);
    };
  }, [socket]);

  const markAllRead = async () => {
    try {
      await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotificationsCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const deleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    try {
      await fetch("http://localhost:5000/api/notifications", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = (notification) => {
    markRead(notification._id);
    // Route based on notification type
    if (notification.type === "booking_request") {
      navigate("/guide-booking-requests");
    } else if (notification.type === "booking_approved" || notification.type === "booking_rejected" || notification.type === "counter_offer") {
      navigate("/my-bookings");
    } else if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderMessage = (n) => {
    if ((n.type === "review" || n.type === "mention" || n.type === "post_like" || n.type === "post_comment") && n.sender) {
      return (
        <p>
          <strong
            className="notif-sender-link"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${n.sender._id}`);
            }}
          >
            {n.sender.username}
          </strong>
          {" "}{n.message}
        </p>
      );
    }
    return <p>{n.message}</p>;
  };

  const getIcon = (type) => {
    switch (type) {
      case "review":
        return "💬";
      case "mention":
        return "🏷️";
      case "application":
        return "📋";
      case "post_like":
        return "❤️";
      case "post_comment":
        return "💬";
      case "booking_request":
        return "📅";
      case "booking_approved":
        return "✅";
      case "booking_rejected":
        return "❌";
      case "counter_offer":
        return "🔄";
      case "booking_message":
        return "💬";
      default:
        return "📬";
    }
  };

  return (
    <div className="notif-page">
      <div className="notif-hero">
        <div className="notif-hero-left">
          <div className="notif-badge">🔔 Notifications</div>
          <h1>Your Activity</h1>
          <p>Stay up to date with your requests, applications, bookings, and admin responses.</p>
        </div>
        <div className="notif-hero-right">
          <div className="notif-stat">
            <span>{notifications.length}</span>
            <label>Total</label>
          </div>
          <div className="notif-stat">
            <span>{unreadCount}</span>
            <label>Unread</label>
          </div>
          {notifications.length > 0 && (
            <button className="notif-clear-btn" onClick={clearAll}>
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="notif-body">
        {loading ? (
          <div className="notif-loading">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">🔕</div>
            <h3>All caught up</h3>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map(n => (
              <div
                key={n._id}
                className={`notif-item ${!n.read ? "unread" : ""}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-icon">{getIcon(n.type)}</div>
                <div className="notif-content">
                  {n.title && <p className="notif-title"><strong>{n.title}</strong></p>}
                  {renderMessage(n)}
                  <span className="notif-date">{formatDate(n.createdAt)}</span>
                </div>
                {!n.read && <div className="notif-dot" />}
                <button
                  className="notif-delete-btn"
                  onClick={(e) => deleteOne(e, n._id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationPage;