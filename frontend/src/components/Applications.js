import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/applications.css";

const BASE_URL = "http://localhost:5000";

function Applications() {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplication();
  }, []);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/guides/my-application`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : null;
      setApplication(data);
    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  };

  if (loading) return <div className="ap-loading">Loading...</div>;

  return (
    <div className="ap-wrapper">
      <div className="ap-container">
        <h1 className="ap-title">My Applications</h1>

        {/* No application */}
        {!application && (
          <div className="ap-card ap-empty">
            <div className="ap-icon">✦</div>
            <h2>No Applications Yet</h2>
            <p>You haven't applied to become a guide yet. Start your journey today.</p>
            <button className="ap-btn ap-btn-primary" onClick={() => navigate("/become-guide")}>
              Apply Now
            </button>
          </div>
        )}

        {/* Has application */}
        {application && (
          <div className={`ap-card ap-status-${application.status}`}>

            {/* Status Header */}
            <div className="ap-card-header">
              <div className="ap-card-title">
                <span className="ap-app-name">{application.fullName}</span>
                <span className={`ap-badge ap-badge-${application.status}`}>
                  {application.status === "pending" && "⏳ Pending Review"}
                  {application.status === "approved" && "✓ Approved"}
                  {application.status === "rejected" && "✕ Rejected"}
                </span>
              </div>
              <p className="ap-submitted">
                Submitted on {new Date(application.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </p>
            </div>

            {/* Details */}
            <div className="ap-details-grid">
              <div className="ap-detail">
                <span className="ap-detail-label">Location</span>
                <span className="ap-detail-value">{application.city}, {application.country}</span>
              </div>
              <div className="ap-detail">
                <span className="ap-detail-label">Phone</span>
                <span className="ap-detail-value">{application.phone}</span>
              </div>
              <div className="ap-detail">
                <span className="ap-detail-label">Languages</span>
                <span className="ap-detail-value">{application.languages?.join(", ")}</span>
              </div>
              <div className="ap-detail">
                <span className="ap-detail-label">Price / Day</span>
                <span className="ap-detail-value">${application.pricePerDay}</span>
              </div>
              <div className="ap-detail ap-detail-full">
                <span className="ap-detail-label">Experience</span>
                <span className="ap-detail-value">{application.experience}</span>
              </div>
              <div className="ap-detail ap-detail-full">
                <span className="ap-detail-label">Bio</span>
                <span className="ap-detail-value">{application.bio}</span>
              </div>
              {application.specialties?.length > 0 && (
                <div className="ap-detail ap-detail-full">
                  <span className="ap-detail-label">Specialties</span>
                  <div className="ap-tags">
                    {application.specialties.map((s, i) => (
                      <span key={i} className="ap-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Messages */}
            {application.status === "pending" && (
              <div className="ap-status-msg ap-msg-pending">
                <span className="ap-pulse">◎</span>
                Your application is currently under review. This usually takes 1–3 business days.
              </div>
            )}

            {application.status === "approved" && (
              <div className="ap-status-msg ap-msg-approved">
                ✓ Congratulations! Your application has been approved. You are now a verified guide.
                <button className="ap-btn ap-btn-primary" style={{ marginTop: "16px" }} onClick={() => navigate("/guide-dashboard")}>
                  Go to Guide Dashboard
                </button>
              </div>
            )}

            {application.status === "rejected" && (
              <div className="ap-status-msg ap-msg-rejected">
                <p>Your application was not approved at this time. You can reapply with updated information.</p>
                <button className="ap-btn ap-btn-primary" onClick={() => navigate("/become-guide")}>
                  Reapply
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default Applications;