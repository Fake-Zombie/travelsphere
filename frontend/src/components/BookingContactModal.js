import React, { useState, useEffect } from "react";
import "../assets/css/BookingContactModal.css";
import { useSocket } from "../context/SocketContext";

function BookingContactModal({ booking, isGuide, onClose, onMessageSent, isOpen = true }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const { socket } = useSocket();
  const token = localStorage.getItem("token");
  const BASE_URL = "http://localhost:5000";

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id;

  // Fetch messages when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchMessages();
  }, [booking._id, isOpen]);

  // Socket listener for new messages (separate effect)
  useEffect(() => {
    if (!socket || !isOpen) return;

    socket.emit("booking:join", booking._id);

    const handleNewMessage = (data) => {
      console.log("🔔 Socket message received:", {
        bookingId: data.bookingId,
        messageId: data.chat._id,
        senderId: data.chat.senderId._id,
        currentUserId: currentUserId,
        match: String(data.chat.senderId._id) === String(currentUserId)
      });

      if (String(data.bookingId) === String(booking._id)) {
        // Only add message if it's from the OTHER person
        if (String(data.chat.senderId._id) !== String(currentUserId)) {
          console.log("✅ Adding message from other person");
          setMessages(prev => {
            const updated = [...prev, data.chat];
            console.log("Messages after add:", updated.map(m => ({ id: m._id, sender: m.senderId.username })));
            return updated;
          });
        } else {
          console.log("❌ Ignoring own message (already added locally)");
        }
      }
    };

    socket.on("booking:message", handleNewMessage);

    return () => {
      socket.off("booking:message", handleNewMessage);
    };
  }, [socket, booking._id, isOpen, currentUserId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/booking-chat/${booking._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      console.log("📥 Fetched messages:", data.map(m => ({ id: m._id, sender: m.senderId.username })));
      setMessages(data);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const messagesContainer = document.querySelector(".bcm-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !phoneNumber.trim()) return;

    try {
      setSending(true);
      console.log("📤 Sending message...");
      
      const res = await fetch(`${BASE_URL}/api/booking-chat/${booking._id}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newMessage,
          phoneNumber: phoneNumber || null,
          isPhoneShare: phoneNumber ? true : false,
        }),
      });

      if (res.ok) {
        const chat = await res.json();
        console.log("✅ Message sent successfully:", chat._id);
        // Add to messages immediately (don't wait for socket)
        setMessages(prev => {
          const updated = [...prev, chat];
          console.log("Messages after send:", updated.map(m => ({ id: m._id, sender: m.senderId.username })));
          return updated;
        });
        setNewMessage("");
        setPhoneNumber("");
        setShowPhoneInput(false);
      } else {
        const err = await res.json();
        console.error("❌ Error response:", err);
        alert(err.message || "Error sending message");
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bcm-overlay" onClick={onClose}>
      <div className="bcm-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bcm-header">
          <div className="bcm-header-content">
            <h2>Contact {isGuide ? "Traveler" : "Guide"}</h2>
            <p className="bcm-subtitle">{booking.destinationId?.name}</p>
          </div>
          <button className="bcm-close" onClick={onClose}>✕</button>
        </div>

        {/* Messages Container */}
        <div className="bcm-messages">
          {loading ? (
            <div className="bcm-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="bcm-empty">
              <span>💬</span>
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg._id} className={`bcm-message ${msg.isPhoneShare ? "phone-share" : ""}`}>
                <div className="bcm-msg-avatar">
                  {msg.senderId?.profile_pic ? (
                    <img
                      src={`${BASE_URL}/static/profile_pics/${msg.senderId.profile_pic}`}
                      alt={msg.senderId?.username}
                    />
                  ) : (
                    <span>{msg.senderId?.username?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="bcm-msg-content">
                  <div className="bcm-msg-header">
                    <span className="bcm-msg-sender">{msg.senderId?.username}</span>
                    <span className="bcm-msg-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {msg.isPhoneShare && msg.phoneNumber ? (
                    <div className="bcm-phone-share">
                      <span className="bcm-phone-icon">📞</span>
                      <a href={`tel:${msg.phoneNumber}`} className="bcm-phone-link">
                        {msg.phoneNumber}
                      </a>
                    </div>
                  ) : null}
                  {msg.message && <p className="bcm-msg-text">{msg.message}</p>}
                </div>
                {msg.read && <span className="bcm-msg-read">✓</span>}
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="bcm-footer">
          {showPhoneInput && isGuide && (
            <div className="bcm-phone-input-wrapper">
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                className="bcm-phone-input"
              />
              <button
                className="bcm-cancel-phone"
                onClick={() => setShowPhoneInput(false)}
              >
                ✕
              </button>
            </div>
          )}

          <div className="bcm-input-group">
            <textarea
              className="bcm-textarea"
              placeholder={isGuide ? "Message traveler..." : "Message guide..."}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              rows="3"
              onKeyPress={e => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleSendMessage();
                }
              }}
            />
            <div className="bcm-actions">
              {isGuide && (
                <button
                  className={`bcm-phone-btn ${showPhoneInput ? "active" : ""}`}
                  onClick={() => setShowPhoneInput(!showPhoneInput)}
                  title="Share phone number"
                >
                  📞 Share Contact
                </button>
              )}
              <button
                className="bcm-send-btn"
                onClick={handleSendMessage}
                disabled={sending || (!newMessage.trim() && !phoneNumber.trim())}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingContactModal;