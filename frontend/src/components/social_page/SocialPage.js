import React, { useState, useEffect } from "react";
import SocialFeed from "./SocialPageSegment1";
import SocialCompanions from "./SocialPageSegment2";
import SocialChat from "./SocialPageSegment3";
import "./socialPage.css";

function SocialPage({ onSocialDotChange }) {
  const [activeSegment, setActiveSegment] = useState(() => {
  return localStorage.getItem("socialActiveSegment") || "feed";
});
  const [openChatUserId, setOpenChatUserId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const handleOpenChat = (userId) => {
    setOpenChatUserId(userId);
    setActiveSegment("chat");
    setChatDrawerOpen(true);
  };

  const handleCloseChatDrawer = () => {
    setChatDrawerOpen(false);
  };
  useEffect(() => {
  localStorage.setItem("socialActiveSegment", activeSegment);
}, [activeSegment]);

  useEffect(() => {
    onSocialDotChange?.(pendingCount > 0 || unreadCount > 0);
  }, [pendingCount, unreadCount]);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:5000/api/companions/pending", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  return (
    <div className="social-root">
      <div className="social-sidebar">
        <p className="social-sidebar-title">Social</p>
        <button
          className={`social-sidebar-item ${activeSegment === "feed" ? "active" : ""}`}
          onClick={() => setActiveSegment("feed")}
        >
          Feed
        </button>
        <button
          className={`social-sidebar-item ${activeSegment === "companions" ? "active" : ""}`}
          onClick={() => setActiveSegment("companions")}
        >
          Companions
          {pendingCount > 0 && <span className="sidebar-dot" />}
        </button>
        <button
          className={`social-sidebar-item ${activeSegment === "chat" ? "active" : ""}`}
          onClick={() => setActiveSegment("chat")}
        >
          Chat
          {unreadCount > 0 && <span className="sidebar-dot" />}
        </button>
      </div>

      <div 
        className={`social-content ${
          chatDrawerOpen ? "chat-drawer-open" : ""
        } ${activeSegment === "chat" ? "chat-segment" : ""}`}
      >
        {activeSegment === "feed" && <SocialFeed />}
        {activeSegment === "companions" && (
          <SocialCompanions
            onOpenChat={handleOpenChat}
            onPendingCount={setPendingCount}
          />
        )}
        {activeSegment === "chat" && (
          <SocialChat
            initialUserId={openChatUserId}
            onUnreadCount={setUnreadCount}
            onChatDrawerOpen={setChatDrawerOpen}
          />
        )}
      </div>
    </div>
  );
}

export default SocialPage;