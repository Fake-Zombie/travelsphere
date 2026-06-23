import React, { useState } from 'react';
import './Modals.css';

const CompletionRequestModal = ({ booking, onClose, onSubmit, isLoading }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRequest = async () => {
    try {
      await onSubmit();
      setShowConfirm(false);
    } catch (error) {
      console.error('Error requesting completion:', error);
    }
  };

  if (showConfirm) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Mark Booking as Completed?</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            <div className="booking-summary">
              <div className="summary-item">
                <span className="label">Traveler:</span>
                <span className="value">{booking.userId?.fullName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Destination:</span>
                <span className="value">{booking.destinationId?.name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Booking Period:</span>
                <span className="value">
                  {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Party Size:</span>
                <span className="value">{booking.partySize} {booking.partySize === 1 ? 'person' : 'people'}</span>
              </div>
            </div>

            <p className="modal-note">
              Once you submit this, the traveler will receive a notification to confirm the booking completion and provide payment/feedback details.
            </p>
          </div>

          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
            >
              Back
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleRequest}
              disabled={isLoading}
            >
              {isLoading ? 'Requesting...' : 'Yes, Request Completion'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Booking Completion</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="booking-summary">
            <div className="summary-item">
              <span className="label">Traveler:</span>
              <span className="value">{booking.userId?.fullName}</span>
            </div>
            <div className="summary-item">
              <span className="label">Destination:</span>
              <span className="value">{booking.destinationId?.name}</span>
            </div>
            <div className="summary-item">
              <span className="label">Booking Ends:</span>
              <span className="value">{new Date(booking.endDate).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="info-box">
            <h4>What happens next?</h4>
            <ul>
              <li>The traveler will receive a notification to complete the booking</li>
              <li>They'll provide payment details, time spent, and feedback</li>
              <li>Once confirmed, your earnings will be updated</li>
              <li>A review/rating will be created in the system</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
          >
            Continue to Confirmation
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionRequestModal;