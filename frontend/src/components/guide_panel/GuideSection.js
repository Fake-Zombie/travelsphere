import React, { useState, useEffect } from "react";
import "./guideSection.css";
import { API_URL } from "../../services/api";
const BASE_URL = API_URL;

function GuideSection() {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("status");

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Stats state (for Overview & Earnings tabs)
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Pending payments state
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState("I've paid via Google Pay");
  const [paymentSubmitLoading, setPaymentSubmitLoading] = useState(false);
  const [adminQRCode] = useState(process.env.REACT_APP_ADMIN_QR_CODE);
  const [adminUPI] = useState(process.env.REACT_APP_ADMIN_UPI_ID);

  // Fetch application on mount
  useEffect(() => {
    fetchApplication();
  }, []);

  // Fetch bookings when Bookings tab is clicked
  useEffect(() => {
    if (activeTab === "bookings" && application?.status === "approved") {
      fetchBookings();
    }
  }, [activeTab, application]);

  // Fetch stats when Overview or Earnings tab is clicked
  useEffect(() => {
    if ((activeTab === "status" || activeTab === "earnings") && application?.status === "approved") {
      fetchStats();
    }
  }, [activeTab, application]);

  // Fetch pending payments when Payments tab is clicked
  useEffect(() => {
    if (activeTab === "payments" && application?.status === "approved") {
      fetchPendingPayments();
    }
  }, [activeTab, application]);

  // Fetch payment history when History tab is clicked
  useEffect(() => {
    if (activeTab === "history" && application?.status === "approved") {
      fetchPaymentHistory();
    }
  }, [activeTab, application]);

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/guides/my-application`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : null;
      setApplication(data);
    } catch (err) {
      console.error("Error fetching application:", err);
    }
    setLoading(false);
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/guide-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      setBookings(data);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
    setBookingsLoading(false);
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem("token");
      console.log("Fetching stats with token:", token ? "✓ Present" : "✗ Missing");

      const res = await fetch(`${BASE_URL}/api/guides/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Stats API response:", res.status, res.statusText);

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Stats API error response:", errorData);
        setStats(null);
        return;
      }

      const data = await res.json();
      console.log("Stats data received:", data);
      setStats(data?.stats || null);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats(null);
    }
    setStatsLoading(false);
  };

  const fetchPendingPayments = async () => {
    try {
      setPaymentsLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/guides/payment-bookings/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch pending payments");
        setPendingPayments([]);
        return;
      }

      const data = await res.json();
      // New endpoint returns: { bookings: [...], totalAmount: "...", count: ... }
      // Transform to match the payment card structure
      const transformedBookings = data.bookings?.map(booking => ({
        _id: booking._id,
        bookingId: booking._id,
        totalAmount: booking.paymentRequest?.amount || (booking.pricePerDay * Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)) * 0.2),
        currency: booking.paymentRequest?.currency || 'INR',
        createdAt: booking.paymentRequest?.createdAt,
        weekStartDate: booking.completedAt,
        weekEndDate: new Date(new Date(booking.completedAt).getTime() + 6 * 24 * 60 * 60 * 1000),
        bookingIds: [booking._id],
        status: 'pending',
        destinationName: booking.destinationId?.name,
        paymentRequest: booking.paymentRequest
      })) || [];

      setPendingPayments(transformedBookings);
    } catch (err) {
      console.error("Error fetching pending payments:", err);
      setPendingPayments([]);
    }
    setPaymentsLoading(false);
  };

  const fetchPaymentHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/guides/payment-bookings/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to fetch payment history");
        setPaymentHistory([]);
        return;
      }

      const data = await res.json();
      // New endpoint returns: { bookings: [...], totalPaid: "...", totalRejected: "...", count: ... }
      // Transform to match the history card structure
      const transformedBookings = data.bookings?.map(booking => ({
        _id: booking._id,
        bookingId: booking._id,
        totalAmount: booking.paymentRequest?.amount || 0,
        currency: booking.paymentRequest?.currency || 'INR',
        paidAt: booking.paymentRequest?.paidAt,
        weekStartDate: booking.completedAt,
        weekEndDate: new Date(new Date(booking.completedAt).getTime() + 6 * 24 * 60 * 60 * 1000),
        bookingIds: [booking._id],
        status: booking.paymentRequest?.status,
        adminNotes: booking.paymentRequest?.adminNotes,
        destinationName: booking.destinationId?.name,
        paymentRequest: booking.paymentRequest
      })) || [];

      setPaymentHistory(transformedBookings);
    } catch (err) {
      console.error("Error fetching payment history:", err);
      setPaymentHistory([]);
    }
    setHistoryLoading(false);
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/${bookingId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchBookings(); // Refresh list
      }
    } catch (err) {
      console.error("Error updating booking:", err);
    }
  };

  // Payment Modal Functions
  const openPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setPaymentScreenshot(null);
    setPaymentNotes("I've paid via Google Pay");
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedPayment(null);
    setPaymentScreenshot(null);
    setPaymentNotes("I've paid via Google Pay");
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentScreenshot(file);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPayment || !paymentScreenshot) {
      alert("Please upload a payment screenshot");
      return;
    }

    try {
      setPaymentSubmitLoading(true);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("paymentScreenshot", paymentScreenshot);
      formData.append("paymentNotes", paymentNotes);

      const res = await fetch(
        `${BASE_URL}/api/guides/payment-bookings/${selectedPayment.bookingId}/submit-proof`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Failed to submit payment proof");

      alert("✓ Payment proof submitted! Admin will verify it shortly.");
      closePaymentModal();
      fetchPendingPayments();
    } catch (err) {
      console.error("Error submitting payment:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setPaymentSubmitLoading(false);
    }
  };

  if (loading) return <div className="gs-loading">Loading...</div>;

  // No application found
  if (!application) {
    return (
      <div className="gs-wrapper">
        <div className="gs-status-card">
          <div className="gs-status-icon gs-icon-none">✦</div>
          <h2>No Application Found</h2>
          <p>You haven't applied to become a guide yet.</p>
          <a href="/become-guide" className="gs-btn gs-btn-primary">
            Apply Now
          </a>
        </div>
      </div>
    );
  }

  // Pending
  if (application.status === "pending") {
    return (
      <div className="gs-wrapper">
        <div className="gs-status-card">
          <div className="gs-status-icon gs-icon-pending">◎</div>
          <h2>Application Under Review</h2>
          <p>
            Your application was submitted on{" "}
            <strong>{new Date(application.createdAt).toLocaleDateString()}</strong>. Our team is reviewing it —
            this usually takes 1–3 business days.
          </p>
          <div className="gs-status-badge gs-badge-pending">Pending Review</div>
        </div>
      </div>
    );
  }

  // Rejected
  if (application.status === "rejected") {
    return (
      <div className="gs-wrapper">
        <div className="gs-status-card">
          <div className="gs-status-icon gs-icon-rejected">✕</div>
          <h2>Application Not Approved</h2>
          <p>
            Unfortunately your application was not approved at this time. You're welcome to reapply with updated
            information.
          </p>
          <div className="gs-status-badge gs-badge-rejected">Rejected</div>
          <a href="/become-guide" className="gs-btn gs-btn-primary" style={{ marginTop: "24px" }}>
            Reapply
          </a>
        </div>
      </div>
    );
  }

  // Approved — full dashboard
  return (
    <div className="gs-dashboard">
      {/* Payment Warning Banner - Show if there are pending payments */}
      {pendingPayments.length > 0 && (
        <div className="gs-payment-banner">
          <span className="gs-payment-icon">⚠️</span>
          <div className="gs-payment-content">
            <p className="gs-payment-title">Pending Payment Verification</p>
            <p className="gs-payment-text">
              You have {pendingPayments.length} payment(s) awaiting admin verification. Admin will review and confirm your payment status.
            </p>
          </div>
          <button
            className="gs-payment-btn"
            onClick={() => setActiveTab("payments")}
          >
            View Payments
          </button>
        </div>
      )}

      {/* Header */}
      <div className="gs-header">
        <div className="gs-header-left">
          <div className="gs-avatar">{application.fullName?.charAt(0).toUpperCase()}</div>
          <div>
            <h1>{application.fullName}</h1>
            <p className="gs-subtitle">
              {application.city}, {application.country}
            </p>
          </div>
        </div>
        <div className="gs-badge-approved">✓ Verified Guide</div>
      </div>

      {/* Tabs */}
      <div className="gs-tabs">
        {["status", "profile", "bookings", "payments", "history", "earnings"].map((tab) => (
          <button
            key={tab}
            className={`gs-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "status" && "Overview"}
            {tab === "profile" && "My Profile"}
            {tab === "bookings" && "Bookings"}
            {tab === "payments" && `Pending Payments ${pendingPayments.length > 0 ? `(${pendingPayments.length})` : ""}`}
            {tab === "history" && "Payment History"}
            {tab === "earnings" && "Earnings"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="gs-content">
        {/* OVERVIEW */}
        {activeTab === "status" && (
          <div className="gs-tab-panel">
            {statsLoading ? (
              <p>Loading stats...</p>
            ) : stats ? (
              <>
                <div className="gs-stats-row">
                  <div className="gs-stat">
                    <span className="gs-stat-value">{stats.totalBookings || 0}</span>
                    <span className="gs-stat-label">Total Bookings</span>
                  </div>
                  <div className="gs-stat">
                    <span className="gs-stat-value">${application.pricePerDay}</span>
                    <span className="gs-stat-label">Price / Day</span>
                  </div>
                  <div className="gs-stat">
                    <span className="gs-stat-value">{application.languages?.length || 0}</span>
                    <span className="gs-stat-label">Languages</span>
                  </div>
                  <div className="gs-stat">
                    <span className="gs-stat-value">{stats.totalReviews || 0}</span>
                    <span className="gs-stat-label">Reviews</span>
                  </div>
                </div>

                <div className="gs-info-grid">
                  <div className="gs-info-card">
                    <h3>Languages</h3>
                    <div className="gs-tags">
                      {application.languages?.map((l, i) => (
                        <span key={i} className="gs-tag">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="gs-info-card">
                    <h3>Specialties</h3>
                    <div className="gs-tags">
                      {application.specialties?.length > 0
                        ? application.specialties.map((s, i) => (
                            <span key={i} className="gs-tag">
                              {s}
                            </span>
                          ))
                        : <span className="gs-empty">None listed</span>}
                    </div>
                  </div>
                  <div className="gs-info-card full">
                    <h3>Bio</h3>
                    <p>{application.bio}</p>
                  </div>
                  <div className="gs-info-card full">
                    <h3>Experience</h3>
                    <p>{application.experience}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="gs-empty-state">
                <span className="gs-error-icon">⚠️</span>
                <p className="gs-error-title"><strong>Unable to load stats</strong></p>
                <p className="gs-error-text">Check browser console for errors. Make sure your backend is running at {BASE_URL}</p>
              </div>
            )}
          </div>
        )}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <div className="gs-tab-panel">
            <div className="gs-profile-grid">
              <div className="gs-profile-row">
                <span className="gs-profile-label">Full Name</span>
                <span className="gs-profile-value">{application.fullName}</span>
              </div>
              <div className="gs-profile-row">
                <span className="gs-profile-label">Phone</span>
                <span className="gs-profile-value">{application.phone}</span>
              </div>
              <div className="gs-profile-row">
                <span className="gs-profile-label">City</span>
                <span className="gs-profile-value">{application.city}</span>
              </div>
              <div className="gs-profile-row">
                <span className="gs-profile-label">Country</span>
                <span className="gs-profile-value">{application.country}</span>
              </div>
              <div className="gs-profile-row">
                <span className="gs-profile-label">Price / Day</span>
                <span className="gs-profile-value">${application.pricePerDay}</span>
              </div>
              <div className="gs-profile-row">
                <span className="gs-profile-label">Member Since</span>
                <span className="gs-profile-value">{new Date(application.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="gs-docs-row">
              <div className="gs-doc-card">
                <p className="gs-doc-label">ID Proof</p>
                <img
                  src={`${BASE_URL}/static/${application.idProofImage
                    .replace(/\\/g, "/")
                    .replace("uploads/", "")}`}
                  alt="ID Proof"
                  className="gs-doc-img"
                />
                <button
                  className="gs-btn gs-btn-outline"
                  onClick={() =>
                    window.open(
                      `${BASE_URL}/static/${application.idProofImage
                        .replace(/\\/g, "/")
                        .replace("uploads/", "")}`,
                      "_blank"
                    )
                  }
                >
                  View Full
                </button>
              </div>
              <div className="gs-doc-card">
                <p className="gs-doc-label">Selfie</p>
                <img
                  src={`${BASE_URL}/static/${application.selfieImage
                    .replace(/\\/g, "/")
                    .replace("uploads/", "")}`}
                  alt="Selfie"
                  className="gs-doc-img"
                />
                <button
                  className="gs-btn gs-btn-outline"
                  onClick={() =>
                    window.open(
                      `${BASE_URL}/static/${application.selfieImage
                        .replace(/\\/g, "/")
                        .replace("uploads/", "")}`,
                      "_blank"
                    )
                  }
                >
                  View Full
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {activeTab === "bookings" && (
          <div className="gs-tab-panel">
            {bookingsLoading ? (
              <p>Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <div className="gs-empty-state">
                <span className="gs-empty-icon">◈</span>
                <p>No bookings yet. Once travelers book you, they'll appear here.</p>
              </div>
            ) : (
              <div className="gs-bookings-list">
                {bookings.map((b) => (
                  <div key={b._id} className="gs-booking-card">
                    <div className="gs-booking-header">
                      <div>
                        <p className="gs-booking-traveler">{b.userId?.username}</p>
                        <p className="gs-booking-destination">{b.destinationId?.name}</p>
                      </div>
                      <span className={`gs-booking-status gs-status-${b.status}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="gs-booking-details">
                      <span>
                        📅 {new Date(b.startDate).toLocaleDateString()} -{" "}
                        {new Date(b.endDate).toLocaleDateString()}
                      </span>
                      <span>👥 {b.partySize} people</span>
                      {b.budgetRange.min > 0 && (
                        <span>
                          💰 ${b.budgetRange.min} - ${b.budgetRange.max}
                        </span>
                      )}
                    </div>
                    {b.notes && <p className="gs-booking-notes">{b.notes}</p>}
                    {b.status === "pending" && (
                      <div className="gs-booking-actions">
                        <button
                          className="gs-btn gs-btn-primary"
                          onClick={() => updateBookingStatus(b._id, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          className="gs-btn gs-btn-outline"
                          onClick={() => updateBookingStatus(b._id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PENDING PAYMENTS */}
        {activeTab === "payments" && (
          <div className="gs-tab-panel">
            {paymentsLoading ? (
              <p>Loading pending payments...</p>
            ) : pendingPayments.length === 0 ? (
              <div className="gs-empty-state">
                <span className="gs-empty-icon">✓</span>
                <p>No pending payments. All payments are up to date!</p>
              </div>
            ) : (
              <div className="gs-payments-list">
                {pendingPayments.map((payment) => (
                  <div key={payment._id} className="gs-payment-card">
                    <div className="gs-payment-card-header">
                      <div>
                        <h3>{payment.destinationName || "Booking Payment"}</h3>
                        <p className="gs-payment-period">
                          {new Date(payment.weekStartDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="gs-payment-status-badge">
                        <span className="gs-payment-status-icon">⏳</span>
                        <span>Pending Verification</span>
                      </div>
                    </div>

                    <div className="gs-payment-card-details">
                      <div className="gs-payment-detail-row">
                        <span className="gs-payment-label">Amount Due</span>
                        <span className="gs-payment-amount">{payment.currency} {payment.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="gs-payment-detail-row">
                        <span className="gs-payment-label">Status</span>
                        <span className="gs-payment-value gs-payment-pending">Awaiting Admin Verification</span>
                      </div>
                    </div>

                    <div className="gs-payment-card-info">
                      <p className="gs-payment-info-text">
                        💡 <strong>Payment Status:</strong> {payment.paymentRequest?.status === 'pending' ? 'Waiting for your proof submission' : 'Admin is reviewing your proof'}
                      </p>
                    </div>

                    {/* RED BLOCK BUTTON - Click to show QR & UPI */}
                    {payment.paymentRequest?.status !== 'submitted' && (
                      <button
                        className="gs-pay-now-btn"
                        onClick={() => openPaymentModal(payment)}
                      >
                        💳 Pay Now & Submit Proof
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAYMENT HISTORY */}
        {activeTab === "history" && (
          <div className="gs-tab-panel">
            {historyLoading ? (
              <p>Loading payment history...</p>
            ) : paymentHistory.length === 0 ? (
              <div className="gs-empty-state">
                <span className="gs-empty-icon">📋</span>
                <p>No payment history yet. Your verified payments will appear here.</p>
              </div>
            ) : (
              <div className="gs-history-list">
                {paymentHistory.map((payment) => (
                  <div key={payment._id} className="gs-history-card">
                    <div className="gs-history-card-header">
                      <div>
                        <h3>{payment.destinationName || "Booking Payment"}</h3>
                        <p className="gs-history-period">
                          {new Date(payment.weekStartDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`gs-history-status-badge ${payment.status === 'paid' ? 'paid' : 'rejected'}`}>
                        <span className="gs-history-status-icon">{payment.status === 'paid' ? '✓' : '✕'}</span>
                        <span>{payment.status === 'paid' ? 'Verified' : 'Rejected'}</span>
                      </div>
                    </div>

                    <div className="gs-history-card-body">
                      <div className="gs-history-row">
                        <span className="gs-history-label">Amount</span>
                        <span className="gs-history-amount">{payment.currency} {payment.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="gs-history-row">
                        <span className="gs-history-label">Status</span>
                        <span className="gs-history-value">{payment.status === 'paid' ? 'Verified & Paid' : 'Rejected'}</span>
                      </div>
                      <div className="gs-history-row">
                        <span className="gs-history-label">Date</span>
                        <span className="gs-history-value">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : 'Pending'}</span>
                      </div>
                      {payment.adminNotes && (
                        <div className="gs-history-row">
                          <span className="gs-history-label">Notes</span>
                          <span className="gs-history-notes">{payment.adminNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EARNINGS */}
        {activeTab === "earnings" && (
          <div className="gs-tab-panel">
            {statsLoading ? (
              <p>Loading earnings...</p>
            ) : stats ? (
              <>
                <div className="gs-stats-row">
                  <div className="gs-stat">
  <span className="gs-stat-value">${(stats.totalEarnings * 0.8).toFixed(2) || 0}</span>
  <span className="gs-stat-label">Total Earned (After 20% Fee)</span>
</div>
                  <div className="gs-stat">
                    <span className="gs-stat-value">{stats.completedBookings || 0}</span>
                    <span className="gs-stat-label">Completed Trips</span>
                  </div>
                  <div className="gs-stat">
                    <span className="gs-stat-value">{stats.totalHoursWorked || 0}</span>
                    <span className="gs-stat-label">Hours Worked</span>
                  </div>
                </div>
                {stats.completedBookings === 0 && (
                  <div className="gs-empty-state gs-empty-earnings">
                    <span className="gs-empty-icon">◈</span>
                    <p>Earnings will appear here once you complete bookings.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="gs-empty-state">
                <span className="gs-error-icon">⚠️</span>
                <p className="gs-error-title"><strong>Unable to load earnings</strong></p>
                <p className="gs-error-text">Check browser console for errors. Make sure your backend is running at {BASE_URL}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PAYMENT MODAL - Inline QR + UPI + Screenshot Upload */}
      {paymentModalOpen && selectedPayment && (
        <div className="gs-payment-modal-overlay" onClick={closePaymentModal}>
          <div className="gs-payment-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="gs-payment-modal-header">
              <h2>💳 Complete Payment</h2>
              <button className="gs-payment-modal-close" onClick={closePaymentModal}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="gs-payment-modal-body">
              {/* Payment Amount Section */}
              <div className="gs-payment-modal-section">
                <h3>Payment Amount</h3>
                <div className="gs-payment-amount-display">
                  <span className="gs-amount-value">
                    {selectedPayment.currency} {selectedPayment.totalAmount.toFixed(2)}
                  </span>
                  <span className="gs-amount-label">20% platform fee</span>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="gs-payment-modal-section">
                <h3>Scan & Pay via UPI</h3>
                <div className="gs-qr-container">
                  {adminQRCode ? (
                    <img
                      src={adminQRCode}
                      alt="UPI QR Code"
                      className="gs-qr-code"
                    />
                  ) : (
                    <div className="gs-qr-placeholder">
                      QR Code not available
                    </div>
                  )}
                </div>
              </div>

              {/* UPI ID Section */}
              <div className="gs-payment-modal-section">
                <h3>Or Transfer to UPI ID</h3>
                <div className="gs-upi-container">
                  <input
                    type="text"
                    value={adminUPI || ""}
                    readOnly
                    className="gs-upi-input"
                  />
                  <button
                    className="gs-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(adminUPI);
                      alert("UPI ID copied!");
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              {/* Screenshot Upload Section */}
              <div className="gs-payment-modal-section">
                <h3>Upload Payment Screenshot</h3>
                <div className="gs-file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="gs-file-input"
                    id="screenshotInput"
                  />
                  <label htmlFor="screenshotInput" className="gs-file-label">
                    {paymentScreenshot ? `✓ ${paymentScreenshot.name}` : "Choose Screenshot"}
                  </label>
                </div>
              </div>

              {/* Notes Section */}
              <div className="gs-payment-modal-section">
                <h3>Payment Notes</h3>
                <textarea
                  className="gs-notes-textarea"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g., I've paid via Google Pay"
                  rows="2"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="gs-payment-modal-actions">
              <button
                className="gs-btn gs-btn-outline"
                onClick={closePaymentModal}
                disabled={paymentSubmitLoading}
              >
                Cancel
              </button>
              <button
                className="gs-btn gs-btn-primary"
                onClick={handlePaymentSubmit}
                disabled={paymentSubmitLoading || !paymentScreenshot}
              >
                {paymentSubmitLoading ? "Submitting..." : "✓ Submit Payment Proof"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuideSection;
