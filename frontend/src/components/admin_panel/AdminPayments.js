import React, { useState, useEffect } from "react";
import "./adminPayments.css";
import { API_URL } from "../../services/api";
const BASE_URL = API_URL;

function AdminPayments() {
  const [activeTab, setActiveTab] = useState("pending");
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [proofDetails, setProofDetails] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, [activeTab]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      
      const endpoint = activeTab === "pending" 
        ? `${BASE_URL}/api/admin/payment-bookings/pending`
        : `${BASE_URL}/api/admin/payment-bookings/history`;
      
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to fetch payouts");

      const data = await res.json();
      
      const transformedPayouts = data.bookings?.map(booking => ({
        _id: booking._id,
        totalAmount: booking.paymentRequest?.amount || 0,
        currency: booking.paymentRequest?.currency || 'USD',
        createdAt: booking.paymentRequest?.createdAt,
        paidAt: booking.paymentRequest?.paidAt,
        submittedAt: booking.paymentRequest?.submittedAt,
        weekStartDate: booking.completedAt,
        weekEndDate: new Date(new Date(booking.completedAt).getTime() + 6 * 24 * 60 * 60 * 1000),
        bookingIds: [booking._id],
        status: activeTab === "pending" ? 'pending' : booking.paymentRequest?.status,
        adminNotes: booking.paymentRequest?.adminNotes,
        guideId: booking.guideId,
        guideUserId: booking.guideId?.userId,
        destinationName: booking.destinationId?.name,
        paymentRequestStatus: booking.paymentRequest?.status
      })) || [];
      
      setPayouts(transformedPayouts);
    } catch (err) {
      console.error("Error fetching payouts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProofDetails = async (bookingId) => {
    try {
      setProofLoading(true);
      setImageError(false);
      setScreenshotUrl(null);
      const token = localStorage.getItem("token");
      
      const res = await fetch(
        `${BASE_URL}/api/admin/payment-bookings/${bookingId}/proof`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) throw new Error("Failed to fetch proof details");

      const data = await res.json();
      setProofDetails(data);
      
      // Fetch screenshot as blob with auth header
      if (data.proof?._id) {
        fetchScreenshot(data.proof._id, token);
      }
    } catch (err) {
      console.error("Error fetching proof details:", err);
      setImageError(true);
      alert(`Error: ${err.message}`);
    } finally {
      setProofLoading(false);
    }
  };

  const fetchScreenshot = async (proofId, token) => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/admin/payment-proofs/${proofId}/screenshot`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        console.error('Screenshot fetch failed:', res.status);
        setImageError(true);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setScreenshotUrl(url);
      setImageError(false);
    } catch (err) {
      console.error('Error fetching screenshot:', err);
      setImageError(true);
    }
  };

  const openModal = (payout) => {
    setSelectedPayout(payout);
    setAdminNotes(payout.adminNotes || "");
    setModalOpen(true);
    
    if (activeTab === "pending") {
      fetchProofDetails(payout._id);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedPayout(null);
    setProofDetails(null);
    setAdminNotes("");
    setImageError(false);
    if (screenshotUrl) {
      URL.revokeObjectURL(screenshotUrl);
      setScreenshotUrl(null);
    }
  };

  const handleVerify = async () => {
    if (!selectedPayout) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/admin/payment-bookings/${selectedPayout._id}/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ adminNotes })
        }
      );

      if (!res.ok) throw new Error("Failed to verify payout");

      alert("✓ Payout verified successfully!");
      closeModal();
      fetchPayouts();
    } catch (err) {
      console.error("Error verifying payout:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayout) return;

    const rejectionReason = prompt(
      "Please enter the reason for rejection:"
    );

    if (!rejectionReason) {
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/admin/payment-bookings/${selectedPayout._id}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ adminNotes: rejectionReason })
        }
      );

      if (!res.ok) throw new Error("Failed to reject payout");

      alert("✓ Payout rejected. Guide has been notified.");
      closeModal();
      fetchPayouts();
    } catch (err) {
      console.error("Error rejecting payout:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading payouts...</div>;
  }

  if (error) {
    return <div className="loading">Error: {error}</div>;
  }

  return (
    <div className="admin-payments">
      {/* Tabs */}
      <div className="ap-tabs">
        <button
          className={`ap-tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Verification ({activeTab === "pending" ? payouts.length : "—"})
        </button>
        <button
          className={`ap-tab ${activeTab === "verified" ? "active" : ""}`}
          onClick={() => setActiveTab("verified")}
        >
          Verified History ({activeTab === "verified" ? payouts.length : "—"})
        </button>
      </div>

      {/* Content */}
      <div className="ap-content">
        {payouts.length === 0 ? (
          <div className="ap-empty">
            <span className="ap-empty-icon">
              {activeTab === "pending" ? "✓" : "📋"}
            </span>
            <h3>
              {activeTab === "pending"
                ? "No Pending Payouts"
                : "No Verified History"}
            </h3>
            <p>
              {activeTab === "pending"
                ? "All guide payments have been verified."
                : "No verified payouts yet."}
            </p>
          </div>
        ) : (
          <div className="ap-list">
            {payouts.map((payout) => (
              <div key={payout._id} className="ap-card">
                {/* Header */}
                <div className="ap-card-header">
                  <div className="ap-guide-info">
                    <h3 className="ap-guide-name">
                      {payout.guideId?.fullName || "Unknown Guide"}
                    </h3>
                    <p className="ap-guide-username">
                      @{payout.guideUserId?.username}
                    </p>
                  </div>
                  <div className="ap-status-badge">
                    {payout.paymentRequestStatus === 'pending' ? (
                      <>
                        <span className="ap-status-icon">⏳</span>
                        <span>Awaiting Proof</span>
                      </>
                    ) : payout.paymentRequestStatus === 'submitted' ? (
                      <>
                        <span className="ap-status-icon">👁️</span>
                        <span>Awaiting Review</span>
                      </>
                    ) : (
                      <>
                        <span className="ap-status-icon">✓</span>
                        <span>Verified</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount & Details */}
                <div className="ap-card-details">
                  <div className="ap-detail-row">
                    <span className="ap-label">Amount Due</span>
                    <span className="ap-amount">
                      {payout.currency} {payout.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="ap-detail-row">
                    <span className="ap-label">Destination</span>
                    <span className="ap-value">
                      {payout.destinationName || "N/A"}
                    </span>
                  </div>
                  <div className="ap-detail-row">
                    <span className="ap-label">Date</span>
                    <span className="ap-value">
                      {new Date(payout.completedAt || payout.weekStartDate).toLocaleDateString()}
                    </span>
                  </div>
                  {payout.paidAt && (
                    <div className="ap-detail-row">
                      <span className="ap-label">Verified On</span>
                      <span className="ap-value">
                        {new Date(payout.paidAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {payout.adminNotes && (
                    <div className="ap-detail-row">
                      <span className="ap-label">Notes</span>
                      <span className="ap-value">{payout.adminNotes}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {activeTab === "pending" && (
                  <button
                    className="ap-verify-btn"
                    onClick={() => openModal(payout)}
                  >
                    Review Payment
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && selectedPayout && (
        <div className="ap-modal-overlay" onClick={closeModal}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h2>Review Payment Proof</h2>
              <button className="ap-modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="ap-modal-body">
              {/* Guide Details */}
              <div className="ap-modal-section">
                <h3>Guide Information</h3>
                <div className="ap-modal-detail">
                  <span className="ap-modal-label">Name</span>
                  <span className="ap-modal-value">
                    {selectedPayout.guideId?.fullName}
                  </span>
                </div>
                <div className="ap-modal-detail">
                  <span className="ap-modal-label">Username</span>
                  <span className="ap-modal-value">
                    @{selectedPayout.guideUserId?.username}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="ap-modal-section">
                <h3>Payment Details</h3>
                <div className="ap-modal-detail">
                  <span className="ap-modal-label">Amount</span>
                  <span className="ap-modal-value ap-amount-large">
                    {selectedPayout.currency}{" "}
                    {selectedPayout.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="ap-modal-detail">
                  <span className="ap-modal-label">Destination</span>
                  <span className="ap-modal-value">
                    {selectedPayout.destinationName}
                  </span>
                </div>
              </div>

              {/* Payment Screenshot */}
              {proofLoading ? (
                <div className="ap-modal-section">
                  <h3>Payment Proof Screenshot</h3>
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading screenshot...</p>
                </div>
              ) : proofDetails?.proof ? (
                <div className="ap-modal-section">
                  <h3>Payment Proof Screenshot</h3>
                  {imageError ? (
                    <div style={{ 
                      padding: '20px', 
                      textAlign: 'center', 
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      color: 'var(--text-muted)'
                    }}>
                      <p>❌ Unable to load screenshot</p>
                    </div>
                  ) : screenshotUrl ? (
                    <>
                      <img
                        src={screenshotUrl}
                        alt="Payment Proof"
                        className="ap-screenshot"
                      />
                      <div className="ap-proof-details">
                        <div className="ap-proof-detail">
                          <span className="ap-proof-label">Submitted</span>
                          <span className="ap-proof-value">
                            {new Date(proofDetails.proof.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        {proofDetails.proof.paymentNotes && (
                          <div className="ap-proof-detail">
                            <span className="ap-proof-label">Guide's Notes</span>
                            <span className="ap-proof-value">
                              {proofDetails.proof.paymentNotes}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Loading image...</p>
                  )}
                </div>
              ) : (
                <div className="ap-modal-section">
                  <h3>Payment Proof Screenshot</h3>
                  <p style={{ color: 'var(--text-muted)' }}>No proof available</p>
                </div>
              )}

              {/* Admin Notes */}
              <div className="ap-modal-section">
                <h3>Admin Verification Notes</h3>
                <textarea
                  className="ap-notes-input"
                  placeholder="Add verification notes (optional)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows="3"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="ap-modal-actions">
              <button
                className="ap-reject-btn"
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "❌ Reject Payment"}
              </button>
              <button
                className="ap-verify-btn-modal"
                onClick={handleVerify}
                disabled={actionLoading}
              >
                {actionLoading ? "Verifying..." : "✓ Verify & Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayments;