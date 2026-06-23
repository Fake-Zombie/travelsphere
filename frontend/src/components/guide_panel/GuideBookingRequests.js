import React, { useState, useEffect } from "react";
import "./guideBookingRequests.css";
import BookingContactModal from "../BookingContactModal";
import CompletionRequestModal from '../modal/CompletionRequestModal';
import Toast from '../toast/Toast';
import { useToast } from '../toast/useToast';

const BASE_URL = "http://localhost:5000";

function GuideBookingRequests() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("accepted");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactBooking, setContactBooking] = useState(null);
  const [completionModal, setCompletionModal] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [activeView, setActiveView] = useState("requests");
  const [selectedCompletionBooking, setSelectedCompletionBooking] = useState(null);
  
  const { toasts, showToast, removeToast } = useToast();

  const canRequestCompletion = (booking) => {
    if (booking.status !== 'accepted') return false;
    if (booking.completionRequested) return false;

    const now = new Date();
    const endDate = new Date(booking.endDate);

    return now >= endDate;
  };

  const handleRequestCompletion = async (booking) => {
    setCompletionModal(booking);
  };

  const submitCompletionRequest = async () => {
    try {
      setIsRequesting(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${BASE_URL}/api/booking/${completionModal._id}/request-completion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to request completion');
      }

      await fetchBookingRequests();
      setCompletionModal(null);

      showToast('Completion request sent to traveler!', 'success');
    } catch (error) {
      console.error('Error requesting completion:', error);
      showToast('Failed to request completion', 'error');
    } finally {
      setIsRequesting(false);
    }
  };

  const openContactModal = (booking) => {
    setContactBooking(booking);
    setShowContactModal(true);
  };

  const [message, setMessage] = useState("");
  const [counterOffer, setCounterOffer] = useState({
    suggestedDates: {
      start: "",
      end: ""
    },
    suggestedPrice: {
      min: "",
      max: ""
    }
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBookingRequests();
  }, []);

  const fetchBookingRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/guide-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      setBookings(data);
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to load booking requests', 'error');
    }
    setLoading(false);
  };

  const filteredBookings = bookings.filter(b => b.status === filter);
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const statusColors = {
    pending: "status-pending",
    accepted: "status-accepted",
    rejected: "status-rejected",
    completed: "status-completed"
  };

  const openModal = (booking, mode) => {
    setSelectedBooking(booking);
    setModalMode(mode);
    setMessage("");
    setCounterOffer({
      suggestedDates: {
        start: booking.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : "",
        end: booking.endDate ? new Date(booking.endDate).toISOString().split('T')[0] : ""
      },
      suggestedPrice: { min: "", max: "" }
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setMessage("");
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/${selectedBooking._id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        closeModal();
        showToast('Booking approved!', 'success');
      }
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to approve booking', 'error');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/${selectedBooking._id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        closeModal();
        showToast('Booking rejected', 'success');
      }
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to reject booking', 'error');
    }
    setActionLoading(false);
  };

  const handleCounterOffer = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/${selectedBooking._id}/counter-offer`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          counterOffer: {
            suggestedDates: counterOffer.suggestedDates.start && counterOffer.suggestedDates.end ? counterOffer.suggestedDates : null,
            suggestedPrice: counterOffer.suggestedPrice.min || counterOffer.suggestedPrice.max ? counterOffer.suggestedPrice : null
          }
        }),
      });

      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        closeModal();
        showToast('Counter offer sent!', 'success');
      }
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to send counter offer', 'error');
    }
    setActionLoading(false);
  };

  if (loading) return <div className="gbr-loading">Loading...</div>;

  return (
    <div className="gbr-wrapper">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="gbr-header">
        <h1>Booking Requests</h1>
        <p className="gbr-subtitle">Review and manage booking requests from travelers</p>
      </div>

      {/* View Tabs */}
      <div className="gbr-view-tabs">
        <button
          className={`gbr-view-tab ${activeView === "requests" ? "active" : ""}`}
          onClick={() => setActiveView("requests")}
        >
          📅 Booking Requests
        </button>
        <button
          className={`gbr-view-tab ${activeView === "completionDetails" ? "active" : ""}`}
          onClick={() => setActiveView("completionDetails")}
        >
          ✓ Completion Details
          <span className="gbr-tab-count">{completedBookings.length}</span>
        </button>
      </div>

      {/* Booking Requests View */}
      {activeView === "requests" && (
        <>
          <div className="gbr-filters">
            {["pending", "accepted", "rejected", "completed"].map(f => (
              <button
                key={f}
                className={`gbr-filter-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="gbr-count">
                  {bookings.filter(b => b.status === f).length}
                </span>
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="gbr-empty">
              <span className="gbr-empty-icon">◈</span>
              <p>No {filter} requests</p>
            </div>
          ) : (
            <div className="gbr-list">
              {filteredBookings.map(booking => (
                <div key={booking._id} className="gbr-card">
                  <div className="gbr-card-header">
                    <div className="gbr-user-info">
                      <div className="gbr-user-avatar">
                        {booking.userId?.profile_pic ? (
                          <img
                            src={`http://localhost:5000/static/profile_pics/${booking.userId.profile_pic}`}
                            alt={booking.userId?.fullName}
                          />
                        ) : (
                          <span className="gbr-avatar-initial">
                            {booking.userId?.username?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3>{booking.userId?.fullName || booking.userId?.username}</h3>
                        <p className="gbr-destination">{booking.destinationId?.name}</p>
                      </div>
                    </div>
                    <span className={`gbr-status ${statusColors[booking.status]}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="gbr-card-body">
                    <div className="gbr-details">
                      <div className="gbr-detail">
                        <span className="gbr-label">📅 Dates</span>
                        <span className="gbr-value">
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="gbr-detail">
                        <span className="gbr-label">👥 Party Size</span>
                        <span className="gbr-value">{booking.partySize} people</span>
                      </div>
                      {booking.budgetRange.min > 0 && (
                        <div className="gbr-detail">
                          <span className="gbr-label">💰 Budget</span>
                          <span className="gbr-value">
                            ${booking.budgetRange.min} - ${booking.budgetRange.max}
                          </span>
                        </div>
                      )}
                    </div>

                    {booking.notes && (
                      <div className="gbr-notes">
                        <p className="gbr-notes-label">Traveler's Notes:</p>
                        <p>{booking.notes}</p>
                      </div>
                    )}

                    {booking.counterOffer && (
                      <div className="gbr-counter-offer">
                        <p className="gbr-counter-label">🔄 Your Counter Offer:</p>
                        {booking.counterOffer.suggestedDates && (
                          <p className="gbr-counter-detail">
                            <strong>Suggested Dates:</strong> {new Date(booking.counterOffer.suggestedDates.start).toLocaleDateString()} - {new Date(booking.counterOffer.suggestedDates.end).toLocaleDateString()}
                          </p>
                        )}
                        {booking.counterOffer.suggestedPrice && (
                          <p className="gbr-counter-detail">
                            <strong>Suggested Price:</strong> ${booking.counterOffer.suggestedPrice.min} - ${booking.counterOffer.suggestedPrice.max}
                          </p>
                        )}
                        {booking.counterOffer.message && (
                          <p className="gbr-counter-detail gbr-counter-message">"{booking.counterOffer.message}"</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="gbr-card-footer">
                    <span className="gbr-date">
                      Requested {new Date(booking.createdAt).toLocaleDateString()}
                    </span>

                    {booking.status === "pending" && !booking.counterOffer && (
                      <div className="gbr-actions">
                        <button
                          className="gbr-btn gbr-btn-accept"
                          onClick={() => openModal(booking, "approve")}
                        >
                          Approve
                        </button>

                        <button
                          className="gbr-btn gbr-btn-counter"
                          onClick={() => openModal(booking, "counter")}
                        >
                          Counter Offer
                        </button>

                        <button
                          className="gbr-btn gbr-btn-reject"
                          onClick={() => openModal(booking, "reject")}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {booking.status === "accepted" && (
                      <div className="gbr-actions">
                        <button
                          className="gbr-btn gbr-btn-contact"
                          onClick={() => openContactModal(booking)}
                        >
                          Contact Traveler
                        </button>

                        {canRequestCompletion(booking) && (
                          <button
                            className="gbr-btn gbr-btn-complete"
                            onClick={() => handleRequestCompletion(booking)}
                            title="Mark booking as completed once end date has passed"
                          >
                            ✓ Mark as Completed
                          </button>
                        )}

                        {booking.completionRequested && (
                          <div className="status-badge completion-pending">
                            ⏳ Waiting for traveler to confirm completion
                          </div>
                        )}
                      </div>
                    )}

                    {booking.status === "completed" && (
                      <div className="status-badge completion-done">
                        ✓ Completed
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Completion Details View */}
      {activeView === "completionDetails" && (
        <div className="gbr-completion-view">
          {completedBookings.length === 0 ? (
            <div className="gbr-empty">
              <span className="gbr-empty-icon">◈</span>
              <p>No completed bookings yet</p>
            </div>
          ) : (
            <div className="gbr-completion-list">
              {selectedCompletionBooking ? (
                <div className="gbr-completion-detail">
                  <button
                    className="gbr-back-btn"
                    onClick={() => setSelectedCompletionBooking(null)}
                  >
                    ← Back to List
                  </button>

                  <div className="gbr-completion-header">
                    <h2>✓ Booking Completed</h2>
                    <p className="gbr-completion-subtitle">
                      Trip to {selectedCompletionBooking.destinationId?.name}
                    </p>
                  </div>

                  <div className="gbr-completion-container">
                    <div className="gbr-completion-left">
                      <div className="gbr-comp-card">
                        <h3 className="gbr-comp-card-title">📍 Trip Information</h3>
                        <div className="gbr-comp-details-grid">
                          <div className="gbr-comp-detail-item">
                            <span className="gbr-comp-label">Destination</span>
                            <span className="gbr-comp-value">
                              {selectedCompletionBooking.destinationId?.name}
                            </span>
                          </div>
                          <div className="gbr-comp-detail-item">
                            <span className="gbr-comp-label">Start Date</span>
                            <span className="gbr-comp-value">
                              {new Date(selectedCompletionBooking.startDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="gbr-comp-detail-item">
                            <span className="gbr-comp-label">End Date</span>
                            <span className="gbr-comp-value">
                              {new Date(selectedCompletionBooking.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="gbr-comp-detail-item">
                            <span className="gbr-comp-label">Party Size</span>
                            <span className="gbr-comp-value">
                              {selectedCompletionBooking.partySize} people
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="gbr-comp-card">
                        <h3 className="gbr-comp-card-title">👥 Traveler Info</h3>
                        <div className="gbr-participant">
                          <div className="gbr-participant-avatar">
                            {selectedCompletionBooking.userId?.profile_pic ? (
                              <img
                                src={`http://localhost:5000/static/profile_pics/${selectedCompletionBooking.userId.profile_pic}`}
                                alt={selectedCompletionBooking.userId?.fullName}
                              />
                            ) : (
                              <span className="gbr-avatar-initial-large">
                                {selectedCompletionBooking.userId?.username?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="gbr-participant-info">
                            <p className="gbr-participant-name">
                              {selectedCompletionBooking.userId?.fullName ||
                                selectedCompletionBooking.userId?.username}
                            </p>
                            <p className="gbr-participant-username">
                              @{selectedCompletionBooking.userId?.username}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="gbr-completion-right">
                      <div className="gbr-comp-card">
                        <h3 className="gbr-comp-card-title">💰 Completion Summary</h3>
                        {selectedCompletionBooking.completionDetails ? (
                          <div className="gbr-comp-details-grid">
                            <div className="gbr-comp-detail-item">
                              <span className="gbr-comp-label">Amount Earned</span>
                              <span className="gbr-comp-value gbr-amount">
                                {selectedCompletionBooking.completionDetails.currency}{" "}
                                {selectedCompletionBooking.completionDetails.amountPaid}
                              </span>
                            </div>
                            <div className="gbr-comp-detail-item">
                              <span className="gbr-comp-label">Payment Method</span>
                              <span className="gbr-comp-value">
                                {selectedCompletionBooking.completionDetails.paymentMethod}
                              </span>
                            </div>
                            <div className="gbr-comp-detail-item">
                              <span className="gbr-comp-label">Time Spent</span>
                              <span className="gbr-comp-value">
                                {selectedCompletionBooking.completionDetails.timeSpent} hours
                              </span>
                            </div>
                            <div className="gbr-comp-detail-item">
                              <span className="gbr-comp-label">Completed On</span>
                              <span className="gbr-comp-value">
                                {new Date(
                                  selectedCompletionBooking.completionDetails.confirmationDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="gbr-no-details">
                            Completion details not yet available
                          </p>
                        )}
                      </div>

                       {selectedCompletionBooking.completionDetails && (
  <div className="gbr-comp-card">
    <h3 className="gbr-comp-card-title">⭐ Traveler Review</h3>

    {selectedCompletionBooking.completionDetails.guideRating && (
      <>
        <div className="gbr-rating-display">
          <div className="gbr-stars">
            {"★".repeat(
              selectedCompletionBooking.completionDetails.guideRating.rating
            )}
            {"☆".repeat(
              5 -
                selectedCompletionBooking.completionDetails.guideRating.rating
            )}
          </div>

          <span className="gbr-rating-number">
            {selectedCompletionBooking.completionDetails.guideRating.rating}/5
          </span>
        </div>

        {selectedCompletionBooking.completionDetails.guideRating.comment && (
          <p className="gbr-review-comment">
            "
            {
              selectedCompletionBooking.completionDetails.guideRating.comment
            }
            "
          </p>
        )}
      </>
    )}

    {(selectedCompletionBooking.completionDetails.feedback ||
      selectedCompletionBooking.completionDetails.travelersNotes) && (
      <>
        {selectedCompletionBooking.completionDetails.feedback && (
          <div className="gbr-feedback-section">
            <p className="gbr-feedback-label">Traveler's Feedback:</p>
            <p className="gbr-feedback-text">
              {selectedCompletionBooking.completionDetails.feedback}
            </p>
          </div>
        )}

        {selectedCompletionBooking.completionDetails.travelersNotes && (
          <div className="gbr-feedback-section">
            <p className="gbr-feedback-label">Additional Notes:</p>
            <p className="gbr-feedback-text">
              {selectedCompletionBooking.completionDetails.travelersNotes}
            </p>
          </div>
        )}
      </>
    )}
  </div>
)}

                      <div className="gbr-status-badge gbr-status-completed">
                        <span className="gbr-status-icon">✓</span>
                        <div>
                          <p className="gbr-status-title">Booking Completed</p>
                          <p className="gbr-status-subtitle">
                            Successfully finished on{" "}
                            {new Date(selectedCompletionBooking.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="gbr-completion-cards">
                  {completedBookings.map(booking => (
                    <div key={booking._id} className="gbr-completion-card">
                      <div className="gbr-completion-card-header">
                        <div className="gbr-completion-card-info">
                          <h4>{booking.destinationId?.name}</h4>
                          <p className="gbr-completion-traveler">
                            {booking.userId?.fullName}
                          </p>
                        </div>
                        <div className="gbr-completion-card-dates">
                          <span>
                            {new Date(booking.startDate).toLocaleDateString()} -{" "}
                            {new Date(booking.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {booking.completionDetails && (
                        <div className="gbr-completion-card-details">
                          <div className="gbr-completion-detail">
                            <span className="gbr-completion-detail-label">Earned</span>
                            <span className="gbr-completion-detail-value">
                              {booking.completionDetails.currency}{" "}
                              {booking.completionDetails.amountPaid}
                            </span>
                          </div>
                          <div className="gbr-completion-detail">
                            <span className="gbr-completion-detail-label">Hours</span>
                            <span className="gbr-completion-detail-value">
                              {booking.completionDetails.timeSpent}h
                            </span>
                          </div>
                          <div className="gbr-completion-detail">
                            <span className="gbr-completion-detail-label">Completed</span>
                            <span className="gbr-completion-detail-value">
                              {new Date(booking.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {booking.completionDetails?.guideRating && (
  <div className="gbr-completion-rating">
    <span className="gbr-rating-stars">
      {"★".repeat(booking.completionDetails.guideRating.rating)}
      {"☆".repeat(5 - booking.completionDetails.guideRating.rating)}
    </span>

    <span className="gbr-rating-text">
      {booking.completionDetails.guideRating.rating}/5
    </span>
  </div>
)}
                        </div>
                      )}

                      <button
                        className="gbr-btn gbr-btn-primary"
                        onClick={() => setSelectedCompletionBooking(booking)}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {showModal && selectedBooking && (
        <div className="gbr-modal-overlay" onClick={closeModal}>
          <div className="gbr-modal" onClick={e => e.stopPropagation()}>
            <div className="gbr-modal-header">
              <h2>
                {modalMode === "approve" && "Approve Booking"}
                {modalMode === "reject" && "Reject Booking"}
                {modalMode === "counter" && "Send Counter Offer"}
                {modalMode === "view" && "Booking Details"}
              </h2>
              <button className="gbr-modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="gbr-modal-body">
              <div className="gbr-modal-summary">
                <div className="gbr-summary-item">
                  <span className="gbr-summary-label">Traveler</span>
                  <span className="gbr-summary-value">
                    {selectedBooking.userId?.fullName}
                  </span>
                </div>
                <div className="gbr-summary-item">
                  <span className="gbr-summary-label">Dates</span>
                  <span className="gbr-summary-value">
                    {new Date(selectedBooking.startDate).toLocaleDateString()} -{" "}
                    {new Date(selectedBooking.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="gbr-summary-item">
                  <span className="gbr-summary-label">Party Size</span>
                  <span className="gbr-summary-value">
                    {selectedBooking.partySize} people
                  </span>
                </div>
              </div>

              {(modalMode === "approve" ||
                modalMode === "reject" ||
                modalMode === "counter") && (
                <>
                  {modalMode === "counter" && (
                    <div className="gbr-form-section">
                      <h3>Suggest Alternative Dates</h3>
                      <div className="gbr-form-group">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={counterOffer.suggestedDates.start}
                          onChange={e =>
                            setCounterOffer({
                              ...counterOffer,
                              suggestedDates: {
                                ...counterOffer.suggestedDates,
                                start: e.target.value
                              }
                            })
                          }
                        />
                      </div>
                      <div className="gbr-form-group">
                        <label>End Date</label>
                        <input
                          type="date"
                          value={counterOffer.suggestedDates.end}
                          onChange={e =>
                            setCounterOffer({
                              ...counterOffer,
                              suggestedDates: {
                                ...counterOffer.suggestedDates,
                                end: e.target.value
                              }
                            })
                          }
                        />
                      </div>

                      <h3>Suggest Price Range</h3>
                      <div className="gbr-form-row">
                        <div className="gbr-form-group">
                          <label>Min Price ($)</label>
                          <input
                            type="number"
                            value={counterOffer.suggestedPrice.min}
                            onChange={e =>
                              setCounterOffer({
                                ...counterOffer,
                                suggestedPrice: {
                                  ...counterOffer.suggestedPrice,
                                  min: e.target.value
                                }
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="gbr-form-group">
                          <label>Max Price ($)</label>
                          <input
                            type="number"
                            value={counterOffer.suggestedPrice.max}
                            onChange={e =>
                              setCounterOffer({
                                ...counterOffer,
                                suggestedPrice: {
                                  ...counterOffer.suggestedPrice,
                                  max: e.target.value
                                }
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="gbr-form-section">
                    <h3>
                      {modalMode === "approve" && "Approval Message"}
                      {modalMode === "reject" && "Rejection Reason"}
                      {modalMode === "counter" && "Message"}
                    </h3>
                    <textarea
                      className="gbr-textarea"
                      placeholder={
                        modalMode === "approve"
                          ? "Send an optional message to confirm..."
                          : modalMode === "reject"
                          ? "Explain why you can't fulfill this request..."
                          : "Explain your counter offer..."
                      }
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows="5"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="gbr-modal-footer">
              <button className="gbr-modal-btn gbr-modal-btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              {modalMode === "approve" && (
                <button
                  className="gbr-modal-btn gbr-modal-btn-approve"
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Approving..." : "Approve Booking"}
                </button>
              )}
              {modalMode === "reject" && (
                <button
                  className="gbr-modal-btn gbr-modal-btn-reject"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Rejecting..." : "Reject Booking"}
                </button>
              )}
              {modalMode === "counter" && (
                <button
                  className="gbr-modal-btn gbr-modal-btn-counter"
                  onClick={handleCounterOffer}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Sending..." : "Send Counter Offer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showContactModal && contactBooking && (
        <BookingContactModal
          booking={contactBooking}
          isGuide={true}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          onMessageSent={() => fetchBookingRequests()}
        />
      )}

      {completionModal && (
        <CompletionRequestModal
          booking={completionModal}
          onClose={() => setCompletionModal(null)}
          onSubmit={submitCompletionRequest}
          isLoading={isRequesting}
        />
      )}
    </div>
  );
}

export default GuideBookingRequests;