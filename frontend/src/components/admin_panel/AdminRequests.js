import React, { useState, useEffect } from "react";
import Modal from "../modal/Modal";
import "../admin_panel/adminRequests.css";

function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminReply, setAdminReply] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: "default", title: "", message: "" });

    const closeModal = () => setModal(m => ({ ...m, isOpen: false }));
    const showError = (msg) => setModal({ isOpen: true, type: "danger", title: "Error", message: msg });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

const updateStatus = async (req, status) => {

  try {
    const token = localStorage.getItem("token");
 const res = await fetch(`http://localhost:5000/api/requests/${req._id}/status`, {
          method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    const updated = await res.json();
    setRequests((prev) =>
      prev.map((r) => (r._id === req._id ? { ...r, status: updated.status } : r))
    );
    if (selectedRequest?._id === req._id) {
      setSelectedRequest((prev) => ({ ...prev, status: updated.status }));
    }
  } catch (err) {
    showError(err.message);
  }
};

  const sendReply = async (req) => {
  if (!adminReply.trim()) return;
  try {
    setReplyLoading(true);
    const token = localStorage.getItem("token");
const res = await fetch(`http://localhost:5000/api/requests/${req._id}/reply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reply: adminReply }),
    });
    if (!res.ok) throw new Error("Failed to send reply");
    const updated = await res.json();
    setRequests((prev) => prev.map((r) => (r._id === req._id ? updated : r)));
    setSelectedRequest(updated);
    setAdminReply("");
  } catch (err) {
    showError(err.message);
  } finally {
    setReplyLoading(false);
  }
};

  const filtered = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const getStatusClass = (status) => {
    if (status === "reviewed") return "status-reviewed";
    if (status === "resolved") return "status-resolved";
    return "status-pending";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) return <div className="ar-loading">Loading requests...</div>;
  if (error) return <div className="ar-error">Error: {error}</div>;

  return (
    <div className="ar-root">
      {/* LEFT PANEL */}
      <div className="ar-list-panel">
        <div className="ar-list-header">
          <h2>User Requests</h2>
          <span className="ar-count">{filtered.length}</span>
        </div>

        <div className="ar-filters">
          {["all", "pending", "reviewed", "resolved"].map((f) => (
            <button
              key={f}
              className={`ar-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ar-filter-count">
                {f === "all"
                  ? requests.length
                  : requests.filter((r) => r.status === f).length}
              </span>
            </button>
          ))}
        </div>

        <div className="ar-list">
          {filtered.length === 0 ? (
            <div className="ar-empty">No requests found.</div>
          ) : (
            filtered.map((req) => (
              <div
                key={req._id}
                className={`ar-list-item ${selectedRequest?._id === req._id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedRequest(req);
                  setAdminReply("");
                }}
              >
                <div className="ar-item-top">
                  <span className="ar-item-user">
                    {req.user?.username || "Unknown User"}
                  </span>
                  <span className={`ar-status-tag ${getStatusClass(req.status)}`}>
                    {req.status}
                  </span>
                </div>
                <div className="ar-item-subject">{req.subject}</div>
                <div className="ar-item-meta">
                  <span>{req.category || "General"}</span>
                  <span>{formatDate(req.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="ar-detail-panel">
        {!selectedRequest ? (
          <div className="ar-placeholder">
            <div className="ar-placeholder-icon">✉</div>
            <p>Select a request to view details</p>
          </div>
        ) : (
          <>
            <div className="ar-detail-header">
              <div>
                <h3>{selectedRequest.subject}</h3>
                <div className="ar-detail-meta">
                  <span>From: <strong>{selectedRequest.user?.username || "Unknown"}</strong></span>
                  <span>·</span>
                  <span>{selectedRequest.user?.email || ""}</span>
                  <span>·</span>
                  <span>{formatDate(selectedRequest.createdAt)}</span>
                  <span>·</span>
                  <span className="ar-category-tag">{selectedRequest.category || "General"}</span>
                </div>
              </div>
              <span className={`ar-status-tag large ${getStatusClass(selectedRequest.status)}`}>
                {selectedRequest.status}
              </span>
            </div>

            <div className="ar-detail-body">
              <p>{selectedRequest.message}</p>
            </div>

            {selectedRequest.adminReply && (
              <div className="ar-existing-reply">
                <div className="ar-reply-label">Your Reply</div>
                <p>{selectedRequest.adminReply}</p>
                {selectedRequest.repliedAt && (
                  <span className="ar-reply-date">
                    Sent {formatDate(selectedRequest.repliedAt)}
                  </span>
                )}
              </div>
            )}

            <div className="ar-reply-box">
              <textarea
                placeholder="Write a reply to this user..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                rows={4}
              />
              <div className="ar-actions">
                <div className="ar-status-actions">
                  <span>Mark as:</span>
                  {["pending", "reviewed", "resolved"].map((s) => (
                    <button
                      key={s}
                      className={`ar-status-btn ${selectedRequest.status === s ? "active-status" : ""}`}
                      onClick={() => updateStatus(selectedRequest, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  className="ar-send-btn"
                  onClick={() => sendReply(selectedRequest)}
                  disabled={replyLoading || !adminReply.trim()}
                >
                  {replyLoading ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <Modal
  isOpen={modal.isOpen}
  onClose={closeModal}
  title={modal.title}
  type={modal.type}
>
  <p>{modal.message}</p>
</Modal>
    </div>
  );
}

export default AdminRequests;