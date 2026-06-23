import React, { useState } from 'react';
import './Modals.css';

const CompletionConfirmModal = ({ booking, onClose, onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    paymentMethod: 'cash',
    amountPaid: '',
    timeSpent: '',
    currency: 'USD',
    guideRating: 0,
    feedback: '',
    travelersNotes: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amountPaid || Number(formData.amountPaid) <= 0) {
      newErrors.amountPaid = 'Please enter a valid amount';
    }

    if (!formData.timeSpent || Number(formData.timeSpent) <= 0) {
      newErrors.timeSpent = 'Please enter valid hours';
    }

    if (!formData.feedback.trim()) {
      newErrors.feedback = 'Please provide feedback about the guide';
    }
    if (!formData.guideRating || formData.guideRating < 1) {
  newErrors.guideRating = 'Please rate the guide';
}

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const setAmount = (amount) => {
    setFormData(prev => ({
      ...prev,
      amountPaid: amount.toString()
    }));
    if (errors.amountPaid) {
      setErrors(prev => ({
        ...prev,
        amountPaid: ''
      }));
    }
  };

  const setTime = (hours) => {
    setFormData(prev => ({
      ...prev,
      timeSpent: hours.toString()
    }));
    if (errors.timeSpent) {
      setErrors(prev => ({
        ...prev,
        timeSpent: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error confirming completion:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Complete Your Booking</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Booking Summary */}
            <div className="booking-summary">
              <div className="summary-item">
                <span className="label">Guide:</span>
                <span className="value">{booking.guideId?.userId?.fullName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Destination:</span>
                <span className="value">{booking.destinationId?.name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Duration:</span>
                <span className="value">
                  {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <hr className="form-divider" />

            {/* Payment Information */}
            <div className="form-section">
              <h3>Payment Information</h3>

              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount Paid *</label>
                  <input
                    type="number"
                    name="amountPaid"
                    value={formData.amountPaid}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`form-input ${errors.amountPaid ? 'error' : ''}`}
                  />
                  <div className="amount-quick-buttons">
                    <button
                      type="button"
                      className={`quick-btn ${formData.amountPaid === '50' ? 'active' : ''}`}
                      onClick={() => setAmount(50)}
                    >
                      $50
                    </button>
                    <button
                      type="button"
                      className={`quick-btn ${formData.amountPaid === '100' ? 'active' : ''}`}
                      onClick={() => setAmount(100)}
                    >
                      $100
                    </button>
                    <button
                      type="button"
                      className={`quick-btn ${formData.amountPaid === '250' ? 'active' : ''}`}
                      onClick={() => setAmount(250)}
                    >
                      $250
                    </button>
                    <button
                      type="button"
                      className={`quick-btn ${formData.amountPaid === '500' ? 'active' : ''}`}
                      onClick={() => setAmount(500)}
                    >
                      $500
                    </button>
                  </div>
                  {errors.amountPaid && <span className="error-text">{errors.amountPaid}</span>}
                </div>

                <div className="form-group">
                  <label>Currency *</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Time Spent (Hours) *</label>
                <input
                  type="number"
                  name="timeSpent"
                  value={formData.timeSpent}
                  onChange={handleChange}
                  placeholder="0.0"
                  step="0.5"
                  min="0"
                  className={`form-input ${errors.timeSpent ? 'error' : ''}`}
                />
                <div className="time-quick-buttons">
                  <button
                    type="button"
                    className={`time-quick-btn ${formData.timeSpent === '4' ? 'active' : ''}`}
                    onClick={() => setTime(4)}
                  >
                    4h
                  </button>
                  <button
                    type="button"
                    className={`time-quick-btn ${formData.timeSpent === '8' ? 'active' : ''}`}
                    onClick={() => setTime(8)}
                  >
                    8h
                  </button>
                  <button
                    type="button"
                    className={`time-quick-btn ${formData.timeSpent === '12' ? 'active' : ''}`}
                    onClick={() => setTime(12)}
                  >
                    12h
                  </button>
                  <button
                    type="button"
                    className={`time-quick-btn ${formData.timeSpent === '24' ? 'active' : ''}`}
                    onClick={() => setTime(24)}
                  >
                    24h
                  </button>
                  <button
                    type="button"
                    className={`time-quick-btn ${formData.timeSpent === '48' ? 'active' : ''}`}
                    onClick={() => setTime(48)}
                  >
                    2 days
                  </button>
                </div>
                {errors.timeSpent && <span className="error-text">{errors.timeSpent}</span>}
              </div>
            </div>

            {/* Feedback & Notes */}
            <div className="form-section">
              <h3>Feedback & Notes</h3>

              <div className="form-group">
  <label>Guide Rating *</label>

  <div className="rating-stars">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`star-btn ${formData.guideRating >= star ? 'active' : ''}`}
        onClick={() =>
          setFormData(prev => ({
            ...prev,
            guideRating: star
          }))
        }
      >
        ★
      </button>
    ))}
  </div>

  <small>
    {formData.guideRating > 0
      ? `${formData.guideRating} out of 5 stars`
      : 'Select a rating'}
  </small>
  {errors.guideRating && (
  <span className="error-text">{errors.guideRating}</span>
)}
</div>

              <div className="form-group">
                <label>Review About Guide *</label>
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleChange}
                  placeholder="Share your experience with the guide... (e.g., professionalism, knowledge, friendliness)"
                  rows="4"
                  maxLength="500"
                  className={`form-input textarea ${errors.feedback ? 'error' : ''}`}
                />
                <small>{formData.feedback.length}/500</small>
                {errors.feedback && <span className="error-text">{errors.feedback}</span>}
              </div>

              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <textarea
                  name="travelersNotes"
                  value={formData.travelersNotes}
                  onChange={handleChange}
                  placeholder="Any additional notes, highlights, or suggestions..."
                  rows="3"
                  maxLength="500"
                  className="form-input textarea"
                />
                <small>{formData.travelersNotes.length}/500</small>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Not Ready Yet
            </button>
            <button 
              type="submit"
              className="btn btn-primary" 
              disabled={isLoading}
            >
              {isLoading ? 'Confirming...' : 'Confirm Completion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompletionConfirmModal;