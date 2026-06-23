import React, { useState } from 'react';
import Modal from '../modal/Modal';
import './BookingModal.css';

function BookingModal({ isOpen, onClose, guideId, destinationId, guideName, onSubmitSuccess }) {
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    partySize: 1,
    budgetRange: { min: 0, max: 0 },
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
  // ... validation code ...

  setError('');
  setLoading(true);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:5000/api/booking/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        guideId,
        destinationId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        partySize: formData.partySize,
        budgetRange: {
          min: formData.budgetRange.min || 0,
          max: formData.budgetRange.max || 0
        },
        notes: formData.notes
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Booking failed');
    }

    onSubmitSuccess?.({
      bookingId: data._id,
      guideName
    });

    setFormData({
      startDate: '',
      endDate: '',
      partySize: 1,
      budgetRange: { min: 0, max: 0 },
      notes: ''
    });

    onClose();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Book with ${guideName}`}
      type="primary"
      confirmText={loading ? 'Sending...' : 'Send Booking Request'}
      onConfirm={handleSubmit}
      confirmDisabled={loading || !formData.startDate || !formData.endDate}
    >
      <div className="booking-modal-body">
        {error && <div className="booking-error">⚠ {error}</div>}

        <div className="booking-form-group">
          <label>Start Date *</label>
          <input
            type="date"
            min={today}
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="booking-form-group">
          <label>End Date *</label>
          <input
            type="date"
            min={today}
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
            disabled={loading}
          />
        </div>

        <div className="booking-form-group">
          <label>Party Size *</label>
          <input
            type="number"
            min="1"
            value={formData.partySize}
            onChange={e => setFormData({ ...formData, partySize: Math.max(1, parseInt(e.target.value) || 1) })}
            disabled={loading}
          />
        </div>

        <div className="booking-form-group booking-budget">
          <label>Budget Range (Optional)</label>
          <div className="budget-inputs">
            <input
              class="price-input"
              type="number"
              placeholder="Min"
              min="0"
              value={formData.budgetRange.min}
              onChange={e => setFormData({
                ...formData,
                budgetRange: { ...formData.budgetRange, min: parseInt(e.target.value) || 0 }
              })}
              disabled={loading}
            />
            <span className="budget-separator">—</span>
            <input
              class="price-input"
              type="number"
              placeholder="Max"
              min="0"
              value={formData.budgetRange.max}
              onChange={e => setFormData({
                ...formData,
                budgetRange: { ...formData.budgetRange, max: parseInt(e.target.value) || 0 }
              })}
              disabled={loading}
            />
          </div>
        </div>

        <div className="booking-form-group">
          <label>Additional Notes (Optional)</label>
          <textarea
            placeholder="Tell the guide about your preferences, interests, special requests..."
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            disabled={loading}
          />
        </div>
      </div>
    </Modal>
  );
}

export default BookingModal;