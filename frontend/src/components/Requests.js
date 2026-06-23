import React, { useState, useEffect } from "react";
import "../assets/css/requests.css";

const CATEGORIES = ["Feature Request", "Bug Report", "Destination Suggestion", "Guide Issue", "Other"];

function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    category: "Feature Request",
    message: "",
  });

useEffect(() => {
  fetchMyRequests();
  const interval = setInterval(fetchMyRequests, 30000);
  const handleVisibility = () => {
    if (document.visibilityState === "visible") fetchMyRequests();
  };
  document.addEventListener("visibilitychange", handleVisibility);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}, []);


const fetchMyRequests = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/requests/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch requests");
    const data = await res.json();
    setRequests(data);
    // sync selectedRequest with fresh data
    setSelectedRequest(prev => prev ? data.find(r => r._id === prev._id) || null : null);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/requests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to submit request");
      const newReq = await res.json();
      setRequests((prev) => [newReq, ...prev]);
      setForm({ subject: "", category: "Feature Request", message: "" });
      setSuccess(true);
      setShowForm(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status) => {
    if (status === "reviewed") return { label: "Reviewed", cls: "req-status-reviewed", icon: "👁" };
    if (status === "resolved") return { label: "Resolved", cls: "req-status-resolved", icon: "✓" };
    return { label: "Pending", cls: "req-status-pending", icon: "⏳" };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  return (
    <div className="req-page">
      {/* HEADER */}
      <div className="req-hero">
        <div className="req-hero-content">
          <div className="req-hero-badge">📬 Admin Requests</div>
          <h1>Have an idea or issue?</h1>
          <p>Share your thoughts, suggestions, or report problems directly with our admin team. We review every request personally.</p>
          <button className="req-new-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Request"}
          </button>
        </div>
        <div className="req-hero-stats">
          <div className="req-stat">
            <span>{requests.length}</span>
            <label>Submitted</label>
          </div>
          <div className="req-stat">
            <span>{requests.filter(r => r.status === "resolved").length}</span>
            <label>Resolved</label>
          </div>
          <div className="req-stat">
  <span>{requests.filter(r => r.status === "reviewed").length}</span>
  <label>Reviewed</label>
</div>
        </div>
      </div>

      {/* SUCCESS TOAST */}
      {success && (
        <div className="req-toast">
          ✓ Request submitted! We'll get back to you soon.
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <div className="req-form-card">
          <h3>New Request</h3>
          <div className="req-form-grid">
            <div className="req-field">
              <label>Subject</label>
              <input
                type="text"
                placeholder="Brief summary of your request..."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="req-field">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="req-field">
            <label>Message</label>
            <textarea
              placeholder="Describe your idea, suggestion, or issue in detail..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
            />
          </div>
          <div className="req-form-actions">
            <span className="req-char-hint">{form.message.length} characters</span>
            <button
              className="req-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !form.subject.trim() || !form.message.trim()}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      )}

      {/* REQUESTS LIST */}
      <div className="req-body">
        <div className="req-list-section">
          {loading ? (
            <div className="req-loading">Loading your requests...</div>
          ) : error ? (
            <div className="req-error">{error}</div>
          ) : requests.length === 0 ? (
            <div className="req-empty">
              <div className="req-empty-icon">📭</div>
              <h3>No requests yet</h3>
              <p>Submit your first request and the admin team will respond shortly.</p>
            </div>
          ) : (
            <div className="req-cards">
              {requests.map((req) => {
                const statusInfo = getStatusInfo(req.status);
                return (
                  <div
                    key={req._id}
                    className={`req-card ${selectedRequest?._id === req._id ? "active" : ""}`}
                    onClick={() => setSelectedRequest(selectedRequest?._id === req._id ? null : req)}
                  >
                    <div className="req-card-top">
                      <div className="req-card-left">
                        <div className="req-card-cat">{req.category || "General"}</div>
                        <h4>{req.subject}</h4>
                      </div>
                      <span className={`req-badge ${statusInfo.cls}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    <p className="req-card-msg">{req.message}</p>

                    <div className="req-card-footer">
                      <span>Submitted {formatDate(req.createdAt)}</span>
                      {req.adminReply && <span className="req-has-reply">💬 Admin replied</span>}
                    </div>

                    {/* EXPANDED REPLY */}
                    {selectedRequest?._id === req._id && req.adminReply && (
                      <div className="req-reply-block">
                        <div className="req-reply-header">
                          <span className="req-reply-icon">🛡</span>
                          <strong>Admin Response</strong>
                          {req.repliedAt && (
                            <span className="req-reply-date">{formatDate(req.repliedAt)}</span>
                          )}
                        </div>
                        <p>{req.adminReply}</p>
                      </div>
                    )}

                    {selectedRequest?._id === req._id && !req.adminReply && (
                      <div className="req-no-reply">
                        <span>⏳</span> Your request is queued — we'll respond soon.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Requests;