import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getProfilePicUrl } from "../../utils/profilePicUrl";
import "./socialPageCompanion.css";
import Modal from "../modal/Modal";
import { useSocket } from "../../context/SocketContext";
import { API_URL } from "../../services/api";
function SocialCompanions({ onOpenChat, onPendingCount }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [companions, setCompanions] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rightTab, setRightTab] = useState("find");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [requestSent, setRequestSent] = useState({});
  const searchTimeout = useRef(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const { socket, onlineUsers } = useSocket();
  const [mobileCompanionOpen, setMobileCompanionOpen] = useState(false);
  const [selectedCompanion, setSelectedCompanion] = useState(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      if (notif.type === "request") fetchAll();
    };
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, [socket]);

  const fetchAll = async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/companions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/companions/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [cData, pData] = await Promise.all([cRes.json(), pRes.json()]);
      setCompanions(Array.isArray(cData) ? cData : []);
      setPending(Array.isArray(pData) ? pData : []);
      onPendingCount?.(Array.isArray(pData) ? pData.length : 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/companions/search?q=${encodeURIComponent(
            searchQuery
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }, [searchQuery]);

  // Replace handleSendRequest
const handleSendRequest = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/api/companions/request/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRequestSent((prev) => ({ ...prev, [userId]: true }));
      fetchAll(); // refresh companionIds + pendingIds so getSearchAction re-evaluates
    }
  } catch (err) {
    console.error(err);
  }
};

// Replace handleCancelRequest
const handleCancelRequest = async (userId) => {
  try {
    const res = await fetch(`${API_URL}/api/companions/cancel/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setRequestSent((prev) => ({ ...prev, [userId]: false }));
      fetchAll(); // refresh so pill/button updates
    }
  } catch (err) {
    console.error(err);
  }
};
  const handleAccept = async (senderId) => {
    await fetch(`${API_URL}/api/companions/accept/${senderId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAll();
    setSelectedCompanion(null);
    setMobileCompanionOpen(false);
  };

  const handleReject = async (senderId) => {
    await fetch(`${API_URL}/api/companions/reject/${senderId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAll();
    setSelectedCompanion(null);
    setMobileCompanionOpen(false);
  };

  const confirmRemove = async () => {
    await fetch(
      `${API_URL}/api/companions/remove/${removeTarget.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    setRemoveTarget(null);
    setSelectedCompanion(null);
    setMobileCompanionOpen(false);
    fetchAll();
  };

  // Helper to open detail panel (sets companion + triggers mobile slide)
  const openDetail = (user) => {
    setSelectedCompanion(user);
    setMobileCompanionOpen(true);
  };

  // Helper to close detail panel
  const closeDetail = () => {
    setSelectedCompanion(null);
    setMobileCompanionOpen(false);
  };

  const isOnline = (userId) => onlineUsers?.includes(userId);

  const Avatar = ({ user, size = 32, showOnline = false }) => {
    if (!user) return null;
    const pic = getProfilePicUrl(user?.profile_pic);
    const letter = user?.username?.charAt(0).toUpperCase() || "U";
    const online = isOnline(user?._id);

    return (
      <div className="comp-avatar-wrap">
        <div
          className="comp-avatar"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {pic ? (
            <img src={pic} alt="" className="comp-avatar-img" />
          ) : (
            <span>{letter}</span>
          )}
        </div>
        {showOnline && online && (
          <span className={`comp-online-dot ${online ? "pulse" : ""}`} />
        )}
      </div>
    );
  };

  const companionIds = new Set(companions.map((c) => c.user._id.toString()));
  const pendingIds = new Set(pending.map((p) => p.sender._id.toString()));

  const getSearchAction = (user) => {
    const uid = user._id.toString();
    if (companionIds.has(uid))
      return <span className="comp-pill">Companions</span>;
    if (pendingIds.has(uid)) return <span className="comp-pill">Pending</span>;
    if (requestSent[uid])
      return (
        <button
          className="comp-btn comp-btn-cancel"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelRequest(uid);
          }}
        >
          Cancel
        </button>
      );
    return (
      <button
        className="comp-btn comp-btn-add"
        onClick={(e) => {
          e.stopPropagation();
          handleSendRequest(uid);
        }}
      >
        Add
      </button>
    );
  };

  if (loading)
    return (
      <div className="comp-layout">
        <div className="comp-loading">Loading...</div>
      </div>
    );

  return (
    <div className={`comp-layout ${mobileCompanionOpen ? "conv-open" : ""}`}>
      {/* LEFT SIDEBAR — Tabs + List */}
      <aside className="comp-sidebar">
        <div className="comp-sidebar-header">
          <h2 className="comp-sidebar-title">Companions</h2>
        </div>

        <div className="comp-tabs">
          <button
            className={`comp-tab ${rightTab === "find" ? "active" : ""}`}
            onClick={() => {
              setRightTab("find");
              closeDetail();
            }}
          >
            Find
          </button>
          <button
            className={`comp-tab ${rightTab === "mine" ? "active" : ""}`}
            onClick={() => {
              setRightTab("mine");
              closeDetail();
            }}
          >
            My Companions
          </button>
          <button
            className={`comp-tab ${rightTab === "requests" ? "active" : ""}`}
            onClick={() => {
              setRightTab("requests");
              closeDetail();
            }}
          >
            Requests
            {pending.length > 0 && (
              <span className="comp-tab-badge">{pending.length}</span>
            )}
          </button>
        </div>

        <div className="comp-list">
          {/* FIND TAB */}
          {rightTab === "find" && (
            <>
              <div className="comp-search-wrap">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="comp-search"
                  placeholder="Search users…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="comp-search-clear"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {searchLoading && <p className="comp-empty">Searching…</p>}

              {!searchLoading &&
                searchQuery.trim() &&
                searchResults.length === 0 && (
                  <p className="comp-empty">No users found.</p>
                )}

              {!searchQuery.trim() && (
                <p className="comp-hint">Type a username to find companions.</p>
              )}

              {searchQuery.trim() && searchResults.length > 0 && (
                <div className="comp-results">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className={`comp-result-row ${
                        selectedCompanion?._id === user._id ? "active" : ""
                      }`}
                      onClick={() => openDetail(user)}
                    >
                      <Avatar user={user} size={36} />
                      <div className="comp-result-info">
                        <span className="comp-result-name">
                          {user.username}
                        </span>
                      </div>
                      <div className="comp-result-action">
                        {getSearchAction(user)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* MY COMPANIONS TAB */}
          {rightTab === "mine" && (
            <>
              {companions.length === 0 ? (
                <p className="comp-empty">No companions yet.</p>
              ) : (
                <div className="comp-results">
                  {companions.map((c) => (
                    <div
                      key={c.companionshipId}
                      className={`comp-result-row ${
                        selectedCompanion?._id === c.user._id ? "active" : ""
                      }`}
                      onClick={() => openDetail(c.user)}
                    >
                      <Avatar user={c.user} size={36} showOnline />
                      <div className="comp-result-info">
                        <span className="comp-result-name">
                          {c.user.username}
                        </span>
                        {isOnline(c.user._id) && (
                          <span className="comp-result-status">Online</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* REQUESTS TAB */}
          {rightTab === "requests" && (
            <>
              {pending.length === 0 ? (
                <p className="comp-empty">No pending requests.</p>
              ) : (
                <div className="comp-results">
                  {pending.map((req) => (
                    <div
                      key={req._id}
                      className={`comp-result-row ${
                        selectedCompanion?._id === req.sender._id ? "active" : ""
                      }`}
                      onClick={() => openDetail(req.sender)}
                    >
                      <Avatar user={req.sender} size={36} showOnline />
                      <div className="comp-result-info">
                        <span className="comp-result-name">
                          {req.sender.username}
                        </span>
                        {isOnline(req.sender._id) && (
                          <span className="comp-result-status">Online</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* RIGHT SECTION — Companion Detail Panel */}
      <section className="comp-section">
        {!selectedCompanion ? (
          <div className="comp-empty-main">
            <div className="comp-empty-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p>Select a companion to view details</p>
          </div>
        ) : (
          <div className="comp-detail">
            {/* Header */}
            <div className="comp-detail-header">
              <button
                className="comp-back-btn"
                onClick={closeDetail}
                aria-label="Back"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h3 className="comp-detail-title">{selectedCompanion.username}</h3>
              <div style={{ width: 36 }} />
            </div>

            {/* Content */}
            <div className="comp-detail-content">
              {/* Avatar & Status */}
              <div className="comp-detail-avatar-section">
                <Avatar user={selectedCompanion} size={80} showOnline />
                <h2 className="comp-detail-name">{selectedCompanion.username}</h2>
                {isOnline(selectedCompanion._id) && (
                  <span className="comp-detail-status">Online</span>
                )}
              </div>

              {/* Actions */}
              <div className="comp-detail-actions">
                {rightTab === "mine" && (
                  <>
                    <button
                      className="comp-btn comp-btn-primary"
                      onClick={() => onOpenChat(selectedCompanion._id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Send Message
                    </button>
                    <button
                      className="comp-btn comp-btn-secondary"
                      onClick={() => navigate(`/user/${selectedCompanion._id}`)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      View Profile
                    </button>
                    <button
                      className="comp-btn comp-btn-danger"
                      onClick={() =>
                        setRemoveTarget({
                          id: selectedCompanion._id,
                          username: selectedCompanion.username,
                        })
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Remove
                    </button>
                  </>
                )}

                {rightTab === "requests" && (
                  <>
                    <button
                      className="comp-btn comp-btn-primary"
                      onClick={() => handleAccept(selectedCompanion._id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Accept
                    </button>
                    <button
                      className="comp-btn comp-btn-secondary"
                      onClick={() => navigate(`/user/${selectedCompanion._id}`)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      View Profile
                    </button>
                    <button
                      className="comp-btn comp-btn-danger"
                      onClick={() => handleReject(selectedCompanion._id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Decline
                    </button>
                  </>
                )}

                {rightTab === "find" && (
                  <>
                    <button
                      className="comp-btn comp-btn-secondary"
                      onClick={() => navigate(`/user/${selectedCompanion._id}`)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      View Profile
                    </button>
                    {getSearchAction(selectedCompanion)}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Companion"
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmRemove}
      >
        <p>
          Are you sure you want to remove{" "}
          <strong>{removeTarget?.username}</strong> as a companion?
        </p>
      </Modal>
    </div>
  );
}

export default SocialCompanions;