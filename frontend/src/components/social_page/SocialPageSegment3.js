import React, { useState, useEffect, useRef, useCallback } from "react";
import { getProfilePicUrl } from "../../utils/profilePicUrl";
import { useSocket } from "../../context/SocketContext";
import "./socialPageChat.css";
import { API_URL } from "../../services/api";

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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConvRef = useRef(activeConv);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Lock body scroll when chat panel is open on mobile
  useEffect(() => {
    if (mobileConvOpen) {
      document.body.classList.add("chat-open");
    } else {
      document.body.classList.remove("chat-open");
    }
    return () => document.body.classList.remove("chat-open");
  }, [mobileConvOpen]);

  // ── LOAD CONVERSATIONS ──────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  // ── LOAD COMPANIONS ─────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/companions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanions(data.map((item) => item.user || item).filter(Boolean));
        } else {
          setCompanions([]);
        }
      })
      .catch(() => setCompanions([]));
  }, [token]);

  // ── OPEN FROM initialUserId PROP ────────────────────
  useEffect(() => {
    if (initialUserId) openConversation(initialUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId]);

  // ── SOCKET LISTENERS ────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.conversation === activeConvRef.current?._id) {
        setMessages((prev) =>
          prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]
        );
      }
      setConversations((prev) =>
        prev.map((c) =>
          c._id === msg.conversation ? { ...c, lastMessage: msg.text } : c
        )
      );
    };

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

  // ── OPEN CONVERSATION ───────────────────────────────
  const openConversation = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/conversations/open/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
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

  // ── SELECT CONVERSATION ─────────────────────────────
  const selectConversation = (conv) => {
    setActiveConv(conv);
    setMobileConvOpen(true);
    loadMessages(conv._id);
    socket?.emit("chat:join", conv._id);
    setConversations((prev) =>
      prev.map((c) => (c._id === conv._id ? { ...c, unread: 0 } : c))
    );
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── LOAD MESSAGES ───────────────────────────────────
  const loadMessages = async (convId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/conversations/${convId}/messages`,
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

  // ── SEND MESSAGE ─────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!msgText.trim() || !activeConv || !socket) return;
    const msgContent = msgText.trim();
    setMsgText("");
    socket.emit("chat:stopTyping", { conversationId: activeConv._id });
    clearTimeout(typingTimeoutRef.current);
    socket.emit("chat:message", {
      conversationId: activeConv._id,
      senderId: storedUser._id,
      text: msgContent,
    });
  }, [msgText, activeConv, socket, storedUser]);

  // ── TYPING ───────────────────────────────────────────
  const handleTypingInput = (e) => {
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

  // ── AUTO SCROLL ──────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── HELPERS ──────────────────────────────────────────
  const getOtherParticipant = (conv) =>
    conv.participants?.find((p) => p._id !== storedUser?._id);

  const isOnline = (userId) => onlineUsers?.includes(userId);

  const filteredConversations = conversations.filter((conv) => {
    const other = getOtherParticipant(conv);
    return other?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredCompanions = companions.filter((comp) => {
    if (!comp?._id || !comp?.username) return false;
    const hasConv = conversations.some(
      (c) => getOtherParticipant(c)?._id === comp._id
    );
    return (
      !hasConv &&
      comp.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const showCompanionsList =
    searchQuery.length > 0 || conversations.length === 0;

  // ── AVATAR ───────────────────────────────────────────
  const Avatar = ({ user, size = 36, showOnline = false }) => {
    if (!user) return null;
    const pic = getProfilePicUrl(user?.profile_pic);
    const letter = user?.username?.charAt(0).toUpperCase() || "?";
    const online = isOnline(user?._id);
    return (
      <div className="sc-avatar-wrap">
        <div
          className="sc-avatar"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {pic ? (
            <img src={pic} alt="" className="sc-avatar-img" />
          ) : (
            <span>{letter}</span>
          )}
        </div>
        {showOnline && online && <span className="sc-online-dot" />}
      </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────
  return (
    <div className={`sc-root${mobileConvOpen ? " sc-panel-open" : ""}`}>

      {/* ── SIDEBAR ── */}
      <aside className="sc-sidebar">
        <div className="sc-sidebar-top">
          <h2 className="sc-sidebar-heading">Messages</h2>
        </div>

        <div className="sc-search-wrap">
          <svg className="sc-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="sc-search"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sc-list">
          {filteredConversations.length > 0 && (
            <>
              {searchQuery && (
                <p className="sc-list-label">Conversations</p>
              )}
              {filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const active = activeConv?._id === conv._id;
                return (
                  <button
                    key={conv._id}
                    className={`sc-row${active ? " sc-row--active" : ""}`}
                    onClick={() => selectConversation(conv)}
                  >
                    <Avatar user={other} size={44} showOnline />
                    <div className="sc-row-body">
                      <span className="sc-row-name">{other?.username}</span>
                      {conv.lastMessage && (
                        <span className="sc-row-preview">{conv.lastMessage}</span>
                      )}
                    </div>
                    {conv.unread > 0 && (
                      <span className="sc-badge">{conv.unread}</span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {showCompanionsList && filteredCompanions.length > 0 && (
            <>
              {searchQuery && filteredConversations.length > 0 && (
                <p className="sc-list-label">Start a conversation</p>
              )}
              {filteredCompanions.map((comp) => (
                <button
                  key={comp._id}
                  className="sc-row sc-row--companion"
                  onClick={() => openConversation(comp._id)}
                >
                  <Avatar user={comp} size={44} showOnline />
                  <div className="sc-row-body">
                    <span className="sc-row-name">{comp.username}</span>
                    <span className="sc-row-sub">
                      {isOnline(comp._id) ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}

          {filteredConversations.length === 0 &&
            filteredCompanions.length === 0 && (
              <div className="sc-empty-list">
                <p>{searchQuery ? "No matches" : "No conversations yet"}</p>
              </div>
            )}
        </div>
      </aside>

      {/* ── PANEL ── */}
      <section className="sc-panel">

        {/* Header */}
        <header className="sc-header">
          <button
            className="sc-back"
            onClick={() => setMobileConvOpen(false)}
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="sc-header-user">
            {activeConv ? (
              <>
                <Avatar user={getOtherParticipant(activeConv)} size={38} showOnline />
                <div className="sc-header-info">
                  <span className="sc-header-name">
                    {getOtherParticipant(activeConv)?.username}
                  </span>
                  {isOnline(getOtherParticipant(activeConv)?._id) && (
                    <span className="sc-header-status">Active now</span>
                  )}
                </div>
              </>
            ) : (
              <span className="sc-header-name">Messages</span>
            )}
          </div>

          <button className="sc-header-menu" aria-label="Options">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </header>

        {/* Body */}
        {!activeConv ? (
          <div className="sc-empty-panel">
            <div className="sc-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="sc-empty-label">Select a conversation</p>
            <p className="sc-empty-sub">Choose someone from the list to start chatting</p>
          </div>
        ) : (
          <>
            {/* Messages stream */}
            <div className="sc-messages">
              {loading ? (
                <div className="sc-messages-state">
                  <span className="sc-spinner" />
                </div>
              ) : messages.length === 0 ? (
                <div className="sc-messages-state">
                  <p>No messages yet — say hello!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn =
                    msg.sender?._id === storedUser?._id ||
                    msg.sender === storedUser?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`sc-msg${isOwn ? " sc-msg--own" : " sc-msg--other"}`}
                    >
                      <span className="sc-bubble">{msg.text}</span>
                      <time className="sc-time">
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  );
                })
              )}

              {isTyping && (
                <div className="sc-msg sc-msg--other">
                  <span className="sc-bubble sc-typing">
                    <span /><span /><span />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <footer className="sc-footer">
              <div className="sc-input-wrap">
                <input
                  ref={inputRef}
                  className="sc-input"
                  placeholder={`Message ${getOtherParticipant(activeConv)?.username ?? ""}…`}
                  value={msgText}
                  onChange={handleTypingInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  className="sc-send"
                  onClick={handleSend}
                  disabled={!msgText.trim()}
                  aria-label="Send"
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