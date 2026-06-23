import React, { useState, useEffect, useRef } from "react";
import { getProfilePicUrl } from "../../utils/profilePicUrl";
import { useSocket } from "../../context/SocketContext";
import "./socialPageChat.css";

function SocialChat({ initialUserId }) {
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const { socket, onlineUsers } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [companions, setCompanions] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileConvOpen, setMobileConvOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingMsg, setSendingMsg] = useState(null);
  
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef();
  const activeConvRef = useRef(activeConv);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);
useEffect(() => {
  if (mobileConvOpen) {
    document.body.classList.add("chat-open");
  } else {
    document.body.classList.remove("chat-open");
  }
 
  return () => {
    document.body.classList.remove("chat-open");
  };
}, [mobileConvOpen]);
 
  // ── LOAD CONVERSATIONS ────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:5000/api/conversations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  // ── LOAD COMPANIONS ───────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch("http://localhost:5000/api/companions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const companionsList = data.map((item) => item.user || item).filter(Boolean);
          setCompanions(companionsList);
        } else {
          setCompanions([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load companions:", err);
        setCompanions([]);
      });
  }, [token]);

  // ── SOCKET LISTENERS ──────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Message received from server - only add if not already in state (by _id)
    const handleMessage = (msg) => {
      // Only add messages that belong to active conversation
      if (msg.conversation === activeConvRef.current?._id) {
        setMessages((prev) => {
          if (prev.find((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setSendingMsg(null); // Clear temp state
      }
      
      // Update conversation last message
      setConversations((prev) =>
        prev.map((c) =>
          c._id === msg.conversation
            ? { ...c, lastMessage: msg.text }
            : c
        )
      );
    };

    // New message notification (for other users)
    const handleNewMessage = ({ conversationId, message }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: message.text, unread: (c.unread || 0) + 1 }
            : c
        )
      );
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("chat:message", handleMessage);
    socket.on("chat:newMessage", handleNewMessage);
    socket.on("chat:typing", handleTyping);
    socket.on("chat:stopTyping", handleStopTyping);

    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("chat:newMessage", handleNewMessage);
      socket.off("chat:typing", handleTyping);
      socket.off("chat:stopTyping", handleStopTyping);
    };
  }, [socket]);

  // ── OPEN CONVERSATION (from companion button) ─────────
  const openConversation = async (userId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/conversations/open/${userId}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const conv = await res.json();
      if (res.ok) {
        setActiveConv(conv);
        setMobileConvOpen(true);
        loadMessages(conv._id);
        setConversations((prev) =>
          prev.find((c) => c._id === conv._id) ? prev : [conv, ...prev]
        );
        socket?.emit("chat:join", conv._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── SELECT CONVERSATION (from list click) ─────────────
  const selectConversation = (conv) => {
    setActiveConv(conv);
    setMobileConvOpen(true);
    loadMessages(conv._id);
    socket?.emit("chat:join", conv._id);
    setConversations((prev) =>
      prev.map((c) => c._id === conv._id ? { ...c, unread: 0 } : c)
    );
  };

  // ── LOAD MESSAGES ─────────────────────────────────────
  const loadMessages = async (convId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/conversations/${convId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── SEND MESSAGE ──────────────────────────────────────
  // FIX: Only emit to socket, let server broadcast back
  const handleSend = () => {
    if (!msgText.trim() || !activeConv || !socket) return;

    const msgContent = msgText;
    setMsgText("");

    // Stop typing immediately
    socket.emit("chat:stopTyping", { conversationId: activeConv._id });
    clearTimeout(typingTimeoutRef.current);

    // Emit message to server
    socket.emit("chat:message", {
      conversationId: activeConv._id,
      senderId: storedUser._id,
      text: msgContent,
    });
  };

  // ── TYPING ────────────────────────────────────────────
  const handleTyping = (e) => {
    setMsgText(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit("chat:typing", {
      conversationId: activeConv._id,
      userId: storedUser._id,
      username: storedUser.username,
    });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("chat:stopTyping", { conversationId: activeConv._id });
    }, 1500);
  };

  // ── AUTO SCROLL ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── HELPERS ───────────────────────────────────────────
  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== storedUser?._id);

  const isOnline = (userId) => onlineUsers?.includes(userId);

  // Filter conversations and companions based on search
  const filteredConversations = (conversations || []).filter((conv) => {
    const other = getOtherParticipant(conv);
    return other?.username?.toLowerCase?.().includes(searchQuery.toLowerCase());
  });

  const filteredCompanions = (companions || []).filter((comp) => {
    if (!comp?._id || !comp?.username) return false;
    const hasExistingConv = conversations.some(
      (c) => getOtherParticipant(c)?._id === comp._id
    );
    return (
      !hasExistingConv &&
      comp.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const showCompanionsList = searchQuery.length > 0 || conversations.length === 0;

  // ── AVATAR COMPONENT ──────────────────────────────────
  const Avatar = ({ user, size = 32, showOnline = false }) => {
    if (!user) return null;
    const pic = getProfilePicUrl(user?.profile_pic);
    const letter = user?.username?.charAt(0).toUpperCase() || "U";
    const online = isOnline(user?._id);
    
    return (
      <div className="chat-avatar-wrap">
        <div
          className="chat-avatar"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {pic ? (
            <img src={pic} alt="" className="chat-avatar-img" />
          ) : (
            <span>{letter}</span>
          )}
        </div>
        {showOnline && online && <span className={`chat-online-dot ${online ? "pulse" : ""}`} />}
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className={`chat-layout ${mobileConvOpen ? "conv-open" : ""}`}>
      {/* LEFT PANEL — CONVERSATION LIST */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2 className="chat-sidebar-title">Messages</h2>
          <button className="chat-settings-btn" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>

        <div className="chat-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="chat-search"
            placeholder="Search messages…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="chat-conv-list">
          {/* CONVERSATIONS SECTION */}
          {filteredConversations.length > 0 && (
            <>
              {searchQuery && (
                <div className="chat-section-label">Your Conversations</div>
              )}
              {filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isActive = activeConv?._id === conv._id;
                return (
                  <div
                    key={conv._id}
                    className={`chat-conv-row ${isActive ? "active" : ""}`}
                    onClick={() => selectConversation(conv)}
                    role="button"
                    tabIndex="0"
                  >
                    <Avatar user={other} size={44} showOnline />
                    <div className="chat-conv-content">
                      <span className="chat-conv-name">{other?.username}</span>
                      {conv.lastMessage && (
                        <span className="chat-conv-preview">{conv.lastMessage}</span>
                      )}
                    </div>
                    {conv.unread > 0 && (
                      <span className="chat-unread-badge">{conv.unread}</span>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* COMPANIONS SECTION */}
          {showCompanionsList && filteredCompanions.length > 0 && (
            <>
              {searchQuery && filteredConversations.length > 0 && (
                <div className="chat-section-label">Start a Conversation</div>
              )}
              {filteredCompanions.map((comp) => (
                <div
                  key={comp._id}
                  className="chat-conv-row companion"
                  onClick={() => openConversation(comp._id)}
                  role="button"
                  tabIndex="0"
                >
                  <Avatar user={comp} size={44} showOnline />
                  <div className="chat-conv-content">
                    <span className="chat-conv-name">{comp.username}</span>
                    <span className="chat-conv-status">
                      {isOnline(comp._id) ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* EMPTY STATE */}
          {filteredConversations.length === 0 && filteredCompanions.length === 0 && (
            <div className="chat-empty-state">
              <p>{searchQuery ? "No matches found" : "No conversations yet"}</p>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT PANEL — MESSAGE AREA */}
      {/* RIGHT PANEL — MESSAGE AREA */}
<section className="chat-section">
  {/* HEADER — always visible */}
  <header className="chat-header">
    <button
      className="chat-back-btn"
      onClick={() => setMobileConvOpen(false)}
      aria-label="Back"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div className="chat-header-user">
      {activeConv ? (
        <>
          <Avatar user={getOtherParticipant(activeConv)} size={40} showOnline />
          <div className="chat-header-info">
            <span className="chat-header-name">
              {getOtherParticipant(activeConv)?.username}
            </span>
            {isOnline(getOtherParticipant(activeConv)?._id) && (
              <span className="chat-header-status">Online</span>
            )}
          </div>
        </>
      ) : (
        <div className="chat-header-info">
          <span className="chat-header-name">Messages</span>
        </div>
      )}
    </div>

    <button className="chat-header-action" aria-label="Options">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
    </button>
  </header>

  {/* BODY */}
  {!activeConv ? (
    <div className="chat-empty-main">
      <div className="chat-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p>Select a conversation to start chatting</p>
    </div>
  ) : (
    <>
      {/* MESSAGES */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-messages-loading"><p>Loading…</p></div>
        ) : messages.length === 0 ? (
          <div className="chat-messages-empty"><p>No messages yet. Say hello!</p></div>
        ) : (
          messages.map((msg) => {
            const isOwn =
              msg.sender?._id === storedUser?._id ||
              msg.sender === storedUser?._id;
            return (
              <div key={msg._id} className={`chat-msg-wrap ${isOwn ? "own" : "other"}`}>
                <div className="chat-msg">
                  <span className="chat-bubble">{msg.text}</span>
                </div>
                <span className="chat-msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="chat-msg-wrap other">
            <div className="chat-msg">
              <span className="chat-bubble chat-typing-indicator">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <footer className="chat-footer">
        <div className="chat-input-wrap">
          <input
            className="chat-input"
            placeholder={`Message ${getOtherParticipant(activeConv)?.username}…`}
            value={msgText}
            onChange={handleTyping}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())
            }
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!msgText.trim()}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </footer>
    </>
  )}
</section>
    </div>
  );
}

export default SocialChat;