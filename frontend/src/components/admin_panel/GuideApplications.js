import React, { useState, useEffect } from "react";
import { API_URL } from "../../services/api";
function GuideApplications() {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/guides/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setApplications(data);
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/guides/applications/${id}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
  setApplications(prev =>
    prev.map(app => app._id === id ? { ...app, status: "approved" } : app)
  );
  setSelectedApp(null);
}
  } catch (err) {
    console.error("Error:", err);
  }
};

  const handleReject = async (id) => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/api/guides/applications/${id}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
  setApplications(prev =>
    prev.map(app => app._id === id ? { ...app, status: "rejected" } : app)
  );
  setSelectedApp(null);
}
  } catch (err) {
    console.error("Error:", err);
  }
};

  const pending = applications.filter(a => a.status === "pending");

  if (loading) return <div>Loading...</div>;

  return (
    <div className="guide-applications">
      <h2>Guide Applications ({pending.length} Pending)</h2>

      {pending.length === 0 ? (
        <p>No pending applications</p>
      ) : (
        <div className="apps-grid">
          {pending.map(app => (
            <div key={app._id} className="app-item">
              <h3>{app.fullName}</h3>
              <p>{app.city}, {app.country}</p>
              <p>Price: ${app.pricePerDay}/day</p>
              <button onClick={() => setSelectedApp(app)}>View Details</button>
            </div>
          ))}
        </div>
      )}

      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedApp.fullName}</h2>
            <p><strong>Phone:</strong> {selectedApp.phone}</p>
            <p><strong>City:</strong> {selectedApp.city}</p>
            <p><strong>Country:</strong> {selectedApp.country}</p>
            <p><strong>Languages:</strong> {selectedApp.languages.join(", ")}</p>
            <p><strong>Experience:</strong> {selectedApp.experience}</p>
            <p><strong>Bio:</strong> {selectedApp.bio}</p>
            <p><strong>Price/Day:</strong> ${selectedApp.pricePerDay}</p>
            {/* Images */}
            <div style={{ display: "flex", gap: "16px", margin: "20px 0" }}>
              <div style={{ flex: 1 }}>
                <p><strong>ID Proof</strong></p>
                <img
                  src={`${API_URL}/static/${selectedApp.idProofImage.replace(/\\/g, "/").replace("uploads/", "")}`}
                  alt="ID Proof"
                  style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border-mid)", marginTop: "8px" }}
                />
                <button
                  className="close-btn"
                  style={{ marginTop: "8px", width: "100%" }}
                  onClick={() => window.open(`${API_URL}/static/${selectedApp.idProofImage.replace(/\\/g, "/").replace("uploads/", "")}`, "_blank")}
                >
                  View Full
                </button>
              </div>

              <div style={{ flex: 1 }}>
                <p><strong>Selfie</strong></p>
                <img
                  src={`${API_URL}/static/${selectedApp.selfieImage.replace(/\\/g, "/").replace("uploads/", "")}`}
                  alt="Selfie"
                  style={{ width: "100%", borderRadius: "4px", border: "1px solid var(--border-mid)", marginTop: "8px" }}
                />
                <button
                  className="close-btn"
                  style={{ marginTop: "8px", width: "100%" }}
                  onClick={() => window.open(`${API_URL}/static/${selectedApp.selfieImage.replace(/\\/g, "/").replace("uploads/", "")}`, "_blank")}
                >
                  View Full
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => handleApprove(selectedApp._id)} className="approve-btn">Approve</button>
              <button onClick={() => handleReject(selectedApp._id)} className="reject-btn">Reject</button>
              <button onClick={() => setSelectedApp(null)} className="close-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuideApplications;