import React, { useState, useEffect } from "react";
import "./pendingPayments.css";
import { API_URL } from "../services/api";
// Import your QR code image here
// import ADMIN_QR_CODE from "../assets/images/qr-code.png";

const BASE_URL = API_URL;
const ADMIN_UPI_ID = process.env.REACT_APP_ADMIN_UPI_ID || "ankurrajak@oksbi";
// Use public URL or imported image
const ADMIN_QR_CODE = process.env.REACT_APP_ADMIN_QR_CODE || "/images/qr-code.png";

function PendingPayments() {
  const [weeklyPayment, setWeeklyPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchWeeklyPayment();
  }, []);

  const fetchWeeklyPayment = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/booking/weekly/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setWeeklyPayment(data.weeklyPayment);
    } catch (err) {
      console.error("Error fetching weekly payment:", err);
    }
    setLoading(false);
  };

  const markAsPaid = async () => {
    if (!weeklyPayment) return;

    try {
      setMarking(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BASE_URL}/api/booking/weekly/${weeklyPayment._id}/mark-paid`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          }
        }
      );

      if (res.ok) {
        alert("✓ Payment marked as paid! Admin will verify shortly.");
        fetchWeeklyPayment();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err) {
      console.error("Error marking payment:", err);
      alert("Error marking payment as paid");
    }
    setMarking(false);
  };

  if (loading) {
    return <div className="pp-loading">Loading payment info...</div>;
  }

  if (!weeklyPayment) {
    return (
      <div className="pp-wrapper">
        <div className="pp-empty">
          <span className="pp-icon">✓</span>
          <h3>No Pending Payments</h3>
          <p>All weekly payments are settled. Great work!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-wrapper">
      {/* HEADER */}
      <div className="pp-header">
        <h2>💳 Weekly Payment Due</h2>
        <p>Scan the QR code or use the UPI ID below to complete your payment.</p>
      </div>

      {/* PAYMENT DETAILS */}
      <div className="pp-total-card">
        <span className="pp-total-label">Amount Due (This Week)</span>
        <span className="pp-total-amount">
          {weeklyPayment.currency} {weeklyPayment.totalAmount.toFixed(2)}
        </span>
        <p className="pp-total-desc">
          Week: {new Date(weeklyPayment.weekStartDate).toLocaleDateString()} -{" "}
          {new Date(weeklyPayment.weekEndDate).toLocaleDateString()}
        </p>
      </div>

      {/* QR CODE SECTION */}
      <div className="pp-qr-section">
        <h3>Scan QR Code</h3>
        <div className="pp-qr-container">
          <img
            src={ADMIN_QR_CODE}
            alt="Admin Google Pay QR"
            className="pp-qr-image"
          />
        </div>
        <p className="pp-qr-note">Scan with Google Pay or UPI app</p>
      </div>

      {/* UPI ID */}
      <div className="pp-upi-section">
        <h3>Or Use UPI ID</h3>
        <div className="pp-upi-box">
          <p className="pp-upi-text">{ADMIN_UPI_ID}</p>
          <button
            className="pp-copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(ADMIN_UPI_ID);
              alert("✓ UPI ID copied!");
            }}
          >
            📋 Copy UPI ID
          </button>
        </div>
      </div>

      {/* BOOKINGS IN THIS WEEK */}
      <div className="pp-bookings-section">
        <h3>Bookings This Week ({weeklyPayment.bookingIds?.length || 0})</h3>
        <div className="pp-bookings-list">
          {weeklyPayment.bookingIds && weeklyPayment.bookingIds.length > 0 ? (
            weeklyPayment.bookingIds.map((booking, idx) => (
              <div key={idx} className="pp-booking-item">
                <span className="pp-booking-amount">
                  {weeklyPayment.currency}{" "}
                  {(booking.earningsAmount || 0).toFixed(2)}
                </span>
                <span className="pp-booking-label">Booking earnings (20%)</span>
              </div>
            ))
          ) : (
            <p>No bookings this week</p>
          )}
        </div>
      </div>

      {/* STATUS SECTION */}
      <div className="pp-status-section">
        <h3>Payment Status</h3>
        <div className="pp-status-badge">
          {weeklyPayment.status === "pending" && (
            <>
              <span className="pp-status-icon">⏳</span>
              <span>Pending Payment</span>
            </>
          )}
          {weeklyPayment.status === "paid" && (
            <>
              <span className="pp-status-icon">✓</span>
              <span>Awaiting Admin Verification</span>
            </>
          )}
        </div>
      </div>

      {/* ACTION BUTTON */}
      {weeklyPayment.status === "pending" && (
        <div className="pp-action-section">
          <button
            className="pp-settle-btn"
            onClick={markAsPaid}
            disabled={marking}
          >
            {marking ? "Processing..." : "✓ I've Paid via Google Pay"}
          </button>
          <p className="pp-action-note">
            Click after you've successfully transferred the amount via Google Pay
          </p>
        </div>
      )}

      {weeklyPayment.status === "paid" && (
        <div className="pp-verified-section">
          <p className="pp-verified-text">
            ✓ Your payment has been recorded. Admin will verify within 24 hours.
          </p>
        </div>
      )}

      {/* INFO */}
      <div className="pp-info">
        <h4>How it works:</h4>
        <ul>
          <li>20% of each completed booking is your earnings</li>
          <li>Payment is due weekly (Monday - Sunday)</li>
          <li>Scan the QR or send via UPI ID to admin's Google Pay</li>
          <li>Click "I've Paid" after transfer, admin verifies within 24 hours</li>
          <li>You can accept new bookings after payment verification</li>
        </ul>
      </div>
    </div>
  );
}

export default PendingPayments;