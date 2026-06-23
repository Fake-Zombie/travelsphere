import React, { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";
import { Link } from "react-router-dom";
import "./NotificationToast.css";

export default function NotificationToast({ onNewNotification }) {
  const { socket } = useSocket();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handler = (notification) => {
      const id = Date.now();
      setToasts(prev => [...prev, { ...notification, toastId: id }]);
      onNewNotification?.(notification);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.toastId !== id));
      }, 5000);
    };

    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  const dismiss = (toastId) =>
    setToasts(prev => prev.filter(t => t.toastId !== toastId));

  const getToastIcon = (type) => {
    switch (type) {
      case "booking_request":
        return "📅";
      case "booking_approved":
        return "✅";
      case "booking_rejected":
        return "❌";
      case "counter_offer":
        return "🔄";
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
      default:
        return "🔔";
    }
  };

  const getToastLink = (type, relatedId) => {
    switch (type) {
      case "booking_request":
        return "/guide-booking-requests";
      case "booking_approved":
      case "booking_rejected":
      case "counter_offer":
        return "/my-bookings";
      default:
        return "";
    }
  };

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.toastId} className="toast-item">
          <div className="toast-icon">{getToastIcon(toast.type)}</div>
          <div className="toast-body">
            {toast.title && (
              <p className="toast-title">{toast.title}</p>
            )}
            <p className="toast-message">{toast.message}</p>
            {(toast.link || getToastLink(toast.type, toast.relatedId)) && (
              <Link
                to={toast.link || getToastLink(toast.type, toast.relatedId)}
                className="toast-link"
                onClick={() => dismiss(toast.toastId)}
              >
                View →
              </Link>
            )}
          </div>
          <button
            className="toast-close"
            onClick={() => dismiss(toast.toastId)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}