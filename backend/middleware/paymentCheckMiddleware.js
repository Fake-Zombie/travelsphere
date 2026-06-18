const Booking = require('../models/Booking');
const GuideApplication = require('../models/GuideApplication');

// Middleware to check if guide has pending payments
// Returns 403 if pending payments exist
const checkPendingPayments = async (req, res, next) => {
  try {
    if (req.user.role !== 'guide') {
      return next();
    }

    const guideApp = await GuideApplication.findOne({ userId: req.user._id });
    
    if (!guideApp) {
      return next();
    }

    const pendingBookings = await Booking.findOne({
      guideId: guideApp._id,
      status: 'completed',
      'paymentRequest.status': 'pending'
    });

    if (pendingBookings) {
      // Whitelist: Allow reading payment data, block creating new bookings
      const safeEndpoints = [
        '/api/guides/payment-bookings/pending',
        '/api/guides/payment-bookings/history',
        '/api/booking/guide-requests',
        '/api/booking/my-bookings',
        '/api/notifications'
      ];

      const isSafeEndpoint = safeEndpoints.some(endpoint => req.path.includes(endpoint));

      if (!isSafeEndpoint) {
        return res.status(403).json({
          message: 'You have pending payments. Please settle them before creating new bookings.',
          hasPendingPayments: true,
          blocked: true
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error checking pending payments:', error);
    next();
  }
};

module.exports = { 
  checkPendingPayments,
  getPendingPaymentCount
};