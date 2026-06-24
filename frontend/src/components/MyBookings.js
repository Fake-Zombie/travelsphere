import React, { useState, useEffect } from "react";
import '../assets/css/myBookings.css';
import BookingContactModal from "./BookingContactModal";
import CompletionConfirmModal from './modal/CompletionConfirmModal';
import BookingModal from './destination_page/BookingModal';
import Toast from './toast/Toast';
import { useToast } from './toast/useToast';
import { API_URL } from "../services/api";
const BASE_URL = API_URL;

function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactBooking, setContactBooking] = useState(null);
  const [completionConfirmModal, setCompletionConfirmModal] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Find Guides tab state
  const [activeTab, setActiveTab] = useState('bookings');
  const [guideSearch, setGuideSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    guideId: null,
    guideName: '',
    destinationId: null,
  });

  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const openContactModal = (booking) => {
    setContactBooking(booking);
    setShowContactModal(true);
  };

  const canConfirmCompletion = (booking) => {
    return booking.status === 'accepted' && booking.completionRequested === true;
  };

  const handleConfirmCompletion = (booking) => {
    setCompletionConfirmModal(booking);
  };

  const submitCompletionConfirm = async (formData) => {
    try {
      setIsConfirming(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${BASE_URL}/api/booking/${completionConfirmModal._id}/confirm-completion`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) throw new Error('Failed to confirm completion');

      await fetchBookings();
      setCompletionConfirmModal(null);
      showToast('Booking completed! Guide will see the payment details.', 'success');
    } catch (error) {
      console.error('Error confirming completion:', error);
      showToast('Failed to confirm completion', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelCompletion = async (bookingId) => {
    try {
      setIsConfirming(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${BASE_URL}/api/booking/${bookingId}/cancel-completion`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to cancel completion');

      await fetchBookings();
      setCompletionConfirmModal(null);
      showToast('Completion request cancelled. You can confirm later.', 'info');
    } catch (error) {
      console.error('Error cancelling completion:', error);
      showToast('Failed to cancel completion request', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.ok ? await res.json() : [];
      setBookings(data);
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to load bookings', 'error');
    }
    setLoading(false);
  };

  const handleGuideSearch = async () => {
    if (!guideSearch.trim()) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResults(null);
    try {
      const token = localStorage.getItem('token');
      const destRes = await fetch(
        `${BASE_URL}/api/destinations?search=${encodeURIComponent(guideSearch.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const destinations = destRes.ok ? await destRes.json() : [];
      if (!destinations.length) {
        setSearchError('No destination found. Try a different name.');
        setSearchLoading(false);
        return;
      }
      const dest = destinations[0];
      const guidesRes = await fetch(
        `${BASE_URL}/api/guides/destination/${dest._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const guides = guidesRes.ok ? await guidesRes.json() : [];
      setSearchResults({ destination: dest, guides });
      if (!guides.length) {
        setSearchError('No guides available for this destination yet.');
      }
    } catch (err) {
      setSearchError('Something went wrong. Please try again.');
    }
    setSearchLoading(false);
  };

  const filteredBookings =
    filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const statusColors = {
    pending: "status-pending",
    accepted: "status-accepted",
    rejected: "status-rejected",
    completed: "status-completed",
  };

  const openModal = (booking, mode) => {
    setSelectedBooking(booking);
    setModalMode(mode);
    setRejectionMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setRejectionMessage("");
  };

  const handleAcceptCounter = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/${selectedBooking._id}/accept-counter`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => (b._id === updatedBooking._id ? updatedBooking : b)));
        closeModal();
        showToast('Counter offer accepted!', 'success');
      }
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to accept counter offer', 'error');
    }
    setActionLoading(false);
  };

  const handleRejectCounter = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/${selectedBooking._id}/reject-counter`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: rejectionMessage }),
      });

      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => (b._id === updatedBooking._id ? updatedBooking : b)));
        closeModal();
        showToast('Counter offer declined', 'success');
      }
    } catch (err) {
      console.error("Error:", err);
      showToast('Failed to decline counter offer', 'error');
    }
    setActionLoading(false);
  };

  if (loading) return <div className="mb-loading">Loading...</div>;

  return (
    <div className="mb-wrapper">
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

      <div className="mb-header">
        <h1>My Bookings</h1>
        <p className="mb-subtitle">Track your guide bookings and their status</p>
      </div>

      {/* Top-level tabs */}
      <div className="mb-tabs">
        <button
          className={`mb-tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          My Bookings
          <span className="mb-count">{bookings.length}</span>
        </button>
        <button
          className={`mb-tab ${activeTab === 'find-guides' ? 'active' : ''}`}
          onClick={() => setActiveTab('find-guides')}
        >
          Find Guides
        </button>
      </div>

      {/* ── MY BOOKINGS TAB ── */}
      {activeTab === 'bookings' && (
        <>
          <div className="mb-filters">
            {["all", "pending", "accepted", "rejected", "completed"].map(f => (
              <button
                key={f}
                className={`mb-filter-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="mb-count">
                  {f === "all"
                    ? bookings.length
                    : bookings.filter(b => b.status === f).length}
                </span>
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="mb-empty">
              <span className="mb-empty-icon">◈</span>
              <p>No bookings found</p>
            </div>
          ) : (
            <div className="mb-list">
              {filteredBookings.map(booking => (
                <div key={booking._id} className="mb-card">
                  <div className="mb-card-header">
                    <div className="mb-guide-info">
                      <h3>{booking.guideId?.fullName || "Guide"}</h3>
                      <p className="mb-destination">{booking.destinationId?.name}</p>
                    </div>
                    <span className={`mb-status ${statusColors[booking.status]}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="mb-card-body">
                    <div className="mb-detail">
                      <span className="mb-label">📅 Dates</span>
                      <span className="mb-value">
                        {new Date(booking.startDate).toLocaleDateString()} -{" "}
                        {new Date(booking.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-detail">
                      <span className="mb-label">👥 Party Size</span>
                      <span className="mb-value">{booking.partySize} people</span>
                    </div>
                    {booking.budgetRange.min > 0 && (
                      <div className="mb-detail">
                        <span className="mb-label">💰 Budget</span>
                        <span className="mb-value">
                          ${booking.budgetRange.min} - ${booking.budgetRange.max}
                        </span>
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <div className="mb-notes">
                      <p className="mb-notes-label">Your Notes:</p>
                      <p>{booking.notes}</p>
                    </div>
                  )}

                  {booking.approvalMessage && (
                    <div className="mb-guide-message mb-approval">
                      <p className="mb-message-label">✅ Guide's Approval Message:</p>
                      <p>{booking.approvalMessage}</p>
                    </div>
                  )}

                  {booking.rejectionReason && (
                    <div className="mb-guide-message mb-rejection">
                      <p className="mb-message-label">❌ Reason for Rejection:</p>
                      <p>{booking.rejectionReason}</p>
                    </div>
                  )}

                  {booking.counterOffer && (
                    <div className="mb-counter-offer">
                      <div className="mb-counter-header">
                        <p className="mb-counter-label">🔄 Guide Sent Counter Offer</p>
                        {booking.counterOffer.message && (
                          <p className="mb-counter-message-label">
                            {booking.counterOffer.message}
                          </p>
                        )}
                      </div>

                      <div className="mb-counter-details">
                        {booking.counterOffer.suggestedDates && (
                          <div className="mb-counter-item">
                            <span className="mb-counter-item-label">Suggested Dates:</span>
                            <span className="mb-counter-item-value">
                              {new Date(booking.counterOffer.suggestedDates.start).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(booking.counterOffer.suggestedDates.end).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {booking.counterOffer.suggestedPrice && (
                          <div className="mb-counter-item">
                            <span className="mb-counter-item-label">Suggested Price:</span>
                            <span className="mb-counter-item-value">
                              ${booking.counterOffer.suggestedPrice.min} - $
                              {booking.counterOffer.suggestedPrice.max}
                            </span>
                          </div>
                        )}
                      </div>

                      {!booking.counterOfferAccepted && !booking.counterOfferRejected && (
                        <div className="mb-counter-actions">
                          <button
                            className="mb-btn mb-btn-accept"
                            onClick={() => openModal(booking, "accept-counter")}
                          >
                            Accept Counter
                          </button>
                          <button
                            className="mb-btn mb-btn-reject"
                            onClick={() => openModal(booking, "reject-counter")}
                          >
                            Decline Counter
                          </button>
                        </div>
                      )}

                      {booking.counterOfferAccepted && (
                        <p className="mb-counter-status mb-counter-accepted">
                          ✅ Counter offer accepted
                        </p>
                      )}

                      {booking.counterOfferRejected && (
                        <div>
                          <p className="mb-counter-status mb-counter-rejected">
                            ❌ Counter offer declined
                          </p>
                          {booking.counterOfferRejectionReason && (
                            <p className="mb-counter-rejection-reason">
                              {booking.counterOfferRejectionReason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {booking.completionRequested && booking.status === 'accepted' && (
                    <div className="completion-alert">
                      <div className="alert-header">
                        <span className="alert-icon">📝</span>
                        <h4>Completion Pending</h4>
                      </div>
                      <p>Your guide is ready to complete this booking. Please confirm the details below.</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleConfirmCompletion(booking)}
                      >
                        Complete Booking
                      </button>
                    </div>
                  )}

                  {booking.status === 'completed' && booking.completionDetails && (
                    <div className="completion-details-card">
                      <h3>Booking Completed ✓</h3>

                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="label">Completed Date:</span>
                          <span className="value">
                            {new Date(booking.completedAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="label">Payment Method:</span>
                          <span className="value capitalize">{booking.completionDetails.paymentMethod}</span>
                        </div>

                        <div className="detail-item">
                          <span className="label">Amount Paid:</span>
                          <span className="value">
                            {booking.completionDetails.currency} {booking.completionDetails.amountPaid}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="label">Time Spent:</span>
                          <span className="value">{booking.completionDetails.timeSpent} hours</span>
                        </div>
                      </div>

                      {booking.completionDetails.feedback && (
                        <div className="feedback-section">
                          <h4>Your Review</h4>
                          <p className="feedback-text">{booking.completionDetails.feedback}</p>
                        </div>
                      )}

                      {booking.completionDetails.travelersNotes && (
                        <div className="notes-section">
                          <h4>Additional Notes</h4>
                          <p className="notes-text">{booking.completionDetails.travelersNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-card-footer">
                    <span className="mb-date">
                      Booked {new Date(booking.createdAt).toLocaleDateString()}
                    </span>
                    {booking.status === "accepted" && (
                      <button
                        className="mb-btn mb-btn-primary"
                        onClick={() => openContactModal(booking)}
                      >
                        Contact Guide
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FIND GUIDES TAB ── */}
      {activeTab === 'find-guides' && (
        <div className="mb-find-guides">
          <div className="mb-find-guides-header">
            <h2>Find a Guide</h2>
            <p className="mb-subtitle">Search by destination to find available local guides</p>
          </div>

          <div className="mb-search-bar">
            <input
              type="text"
              className="mb-search-input"
              placeholder="Enter a destination (e.g. Bali, Paris, Manali...)"
              value={guideSearch}
              onChange={e => setGuideSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuideSearch()}
            />
            <button
              className="mb-search-btn"
              onClick={handleGuideSearch}
              disabled={searchLoading || !guideSearch.trim()}
            >
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchError && (
            <div className="mb-search-error">
              <span>⚠ {searchError}</span>
            </div>
          )}

          {searchResults && (
            <div className="mb-search-results">
              <div className="mb-search-dest-label">
                <span className="mb-dest-tag">📍 {searchResults.destination.name}, {searchResults.destination.country}</span>
                <span className="mb-dest-guide-count">{searchResults.guides.length} guide{searchResults.guides.length !== 1 ? 's' : ''} found</span>
              </div>

              {searchResults.guides.length > 0 && (
                <div className="mb-guide-results-list">
                  {searchResults.guides.map(guide => (
                    <div key={guide._id} className="mb-guide-result-card">
                      <div className="mb-guide-result-avatar">
                        {guide.userId?.profile_pic ? (
                          <img
                            src={`${BASE_URL}/uploads/${guide.userId.profile_pic}`}
                            alt={guide.fullName}
                          />
                        ) : (
                          <span>{guide.fullName?.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="mb-guide-result-info">
                        <h3 className="mb-guide-result-name">{guide.fullName}</h3>
                        <p className="mb-guide-result-location">📍 {guide.city}, {guide.country}</p>
                        {guide.languages?.length > 0 && (
                          <p className="mb-guide-result-langs">🗣 {guide.languages.join(', ')}</p>
                        )}
                        {guide.pricePerDay > 0 && (
                          <p className="mb-guide-result-price">💰 ${guide.pricePerDay} / day</p>
                        )}
                        {guide.bio && (
                          <p className="mb-guide-result-bio">{guide.bio}</p>
                        )}
                      </div>

                      <div className="mb-guide-result-actions">
                        <button
                          className="mb-btn mb-btn-primary"
                          onClick={() => setBookingModal({
                            isOpen: true,
                            guideId: guide._id,
                            guideName: guide.fullName,
                            destinationId: searchResults.destination._id,
                          })}
                        >
                          Book Guide
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!searchResults && !searchLoading && !searchError && (
            <div className="mb-find-guides-empty">
              <span className="mb-empty-icon">🧭</span>
              <p>Search a destination above to discover local guides</p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL ── */}
      {showModal && selectedBooking && (
        <div className="mb-modal-overlay" onClick={closeModal}>
          <div className="mb-modal" onClick={e => e.stopPropagation()}>
            <div className="mb-modal-header">
              <h2>
                {modalMode === "accept-counter" && "Accept Counter Offer"}
                {modalMode === "reject-counter" && "Decline Counter Offer"}
              </h2>
              <button className="mb-modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="mb-modal-body">
              <div className="mb-modal-summary">
                <div className="mb-summary-item">
                  <span className="mb-summary-label">Guide</span>
                  <span className="mb-summary-value">
                    {selectedBooking.guideId?.fullName}
                  </span>
                </div>
                <div className="mb-summary-item">
                  <span className="mb-summary-label">Destination</span>
                  <span className="mb-summary-value">
                    {selectedBooking.destinationId?.name}
                  </span>
                </div>
              </div>

              {selectedBooking.counterOffer && (
                <div className="mb-modal-counter">
                  <h3>Counter Offer Details</h3>
                  {selectedBooking.counterOffer.suggestedDates && (
                    <div className="mb-modal-field">
                      <label>Suggested Dates:</label>
                      <p>
                        {new Date(
                          selectedBooking.counterOffer.suggestedDates.start
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          selectedBooking.counterOffer.suggestedDates.end
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedBooking.counterOffer.suggestedPrice && (
                    <div className="mb-modal-field">
                      <label>Suggested Price:</label>
                      <p>
                        ${selectedBooking.counterOffer.suggestedPrice.min} - $
                        {selectedBooking.counterOffer.suggestedPrice.max}
                      </p>
                    </div>
                  )}
                  {selectedBooking.counterOffer.message && (
                    <div className="mb-modal-field">
                      <label>Guide's Message:</label>
                      <p>{selectedBooking.counterOffer.message}</p>
                    </div>
                  )}
                </div>
              )}

              {modalMode === "reject-counter" && (
                <div className="mb-form-section">
                  <label htmlFor="rejection-msg">
                    Why are you declining? (optional)
                  </label>
                  <textarea
                    id="rejection-msg"
                    className="mb-textarea"
                    placeholder="Let the guide know your thoughts..."
                    value={rejectionMessage}
                    onChange={e => setRejectionMessage(e.target.value)}
                    rows="4"
                  />
                </div>
              )}
            </div>

            <div className="mb-modal-footer">
              <button className="mb-modal-btn mb-modal-btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              {modalMode === "accept-counter" && (
                <button
                  className="mb-modal-btn mb-modal-btn-accept"
                  onClick={handleAcceptCounter}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Accepting..." : "Accept Counter Offer"}
                </button>
              )}
              {modalMode === "reject-counter" && (
                <button
                  className="mb-modal-btn mb-modal-btn-reject"
                  onClick={handleRejectCounter}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Declining..." : "Decline Counter Offer"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showContactModal && contactBooking && (
        <BookingContactModal
          booking={contactBooking}
          isGuide={false}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          onMessageSent={() => fetchBookings()}
        />
      )}

      {completionConfirmModal && (
        <CompletionConfirmModal
          booking={completionConfirmModal}
          onClose={() => setCompletionConfirmModal(null)}
          onSubmit={submitCompletionConfirm}
          onCancel={() => handleCancelCompletion(completionConfirmModal._id)}
          isLoading={isConfirming}
        />
      )}

      {bookingModal.isOpen && (
        <BookingModal
          isOpen={bookingModal.isOpen}
          onClose={() => setBookingModal({ isOpen: false, guideId: null, guideName: '', destinationId: null })}
          guideId={bookingModal.guideId}
          destinationId={bookingModal.destinationId}
          guideName={bookingModal.guideName}
          onSubmitSuccess={() => {
            setBookingModal({ isOpen: false, guideId: null, guideName: '', destinationId: null });
            showToast(`Booking request sent to ${bookingModal.guideName}!`, 'success');
            setActiveTab('bookings');
            fetchBookings();
          }}
        />
      )}
    </div>
  );
}

export default MyBookings;