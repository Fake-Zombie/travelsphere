const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const PaymentProof = require('../models/PaymentProof');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// ========== ADMIN PAYMENT ENDPOINTS ==========

/**
 * GET /api/admin/payment-bookings/pending
 * Admin fetches all pending payment proofs awaiting verification
 */
router.get('/payment-bookings/pending', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: 'completed',
      'paymentRequest.status': { $in: ['pending', 'submitted'] }
    })
      .populate('userId', 'fullName username')
      .populate('guideId', 'fullName')
      .populate('guideId.userId', 'username')
      .populate('destinationId', 'name')
      .sort({ 'paymentRequest.createdAt': -1 });

    res.json({
      bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/payment-bookings/history
 * Admin fetches verified + rejected payment history
 */
router.get('/payment-bookings/history', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: 'completed',
      'paymentRequest.status': { $in: ['paid', 'rejected'] }
    })
      .populate('userId', 'fullName username')
      .populate('guideId', 'fullName')
      .populate('guideId.userId', 'username')
      .populate('destinationId', 'name')
      .populate('paymentRequest.verifiedBy', 'fullName')
      .sort({ 'paymentRequest.paidAt': -1 });

    res.json({
      bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/payment-proofs/pending
 * Admin fetches all pending payment proofs with screenshots
 */
router.get('/payment-proofs/pending', protect, adminOnly, async (req, res) => {
  try {
    const proofs = await PaymentProof.find({ status: 'pending' })
      .populate('guideUserId', 'fullName username email phone')
      .populate('bookingId', 'startDate endDate completedAt')
      .sort({ submittedAt: -1 });

    res.json({
      proofs,
      count: proofs.length
    });
  } catch (error) {
    console.error('Error fetching payment proofs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/admin/payment-proofs/:proofId
 * Admin views specific payment proof with screenshot
 */
router.get('/payment-proofs/:proofId', protect, adminOnly, async (req, res) => {
  try {
    const proof = await PaymentProof.findById(req.params.proofId)
      .populate('guideUserId', 'fullName username email phone')
      .populate('bookingId')
      .populate('verifiedBy', 'fullName username');

    if (!proof) {
      return res.status(404).json({ message: 'Payment proof not found' });
    }

    res.json(proof);
  } catch (error) {
    console.error('Error fetching payment proof:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/admin/payment-bookings/:bookingId/verify
 * Admin verifies a payment and marks booking payment as paid
 * 
 * Body:
 * - adminNotes: String (optional verification notes)
 */
router.put('/payment-bookings/:bookingId/verify', protect, adminOnly, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const booking = await Booking.findById(req.params.bookingId)
      .populate('guideId')
      .populate('guideId.userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Booking is not completed' });
    }

    // Update booking payment status
    booking.paymentRequest.status = 'paid';
    booking.paymentRequest.paidAt = new Date();
    booking.paymentRequest.verifiedBy = req.user._id;
    booking.paymentRequest.adminNotes = adminNotes || '';
    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: booking.guideId.userId,
      type: 'payment_verified',
      title: '💰 Payment Verified!',
      message: `Your payment of ${booking.paymentRequest.currency} ${booking.paymentRequest.amount.toFixed(2)} has been verified and processed.`,
      relatedId: booking._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.guideId.userId, {
        type: 'payment_verified',
        title: '💰 Payment Verified!',
        message: `Your payment of ${booking.paymentRequest.currency} ${booking.paymentRequest.amount.toFixed(2)} has been verified and processed.`,
        relatedId: booking._id
      });
      io.emitCounts(booking.guideId.userId);
    }

    res.json({
      message: 'Payment verified successfully',
      booking
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * PUT /api/admin/payment-bookings/:bookingId/reject
 * Admin rejects a payment request
 * 
 * Body:
 * - adminNotes: String (rejection reason)
 */
router.put('/payment-bookings/:bookingId/reject', protect, adminOnly, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const booking = await Booking.findById(req.params.bookingId)
      .populate('guideId')
      .populate('guideId.userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update booking payment status
    booking.paymentRequest.status = 'rejected';
    booking.paymentRequest.adminNotes = adminNotes || 'Payment rejected';
    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: booking.guideId.userId,
      type: 'payment_rejected',
      title: '❌ Payment Rejected',
      message: `Your payment request has been rejected. Reason: ${adminNotes}`,
      relatedId: booking._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.guideId.userId, {
        type: 'payment_rejected',
        title: '❌ Payment Rejected',
        message: `Your payment request has been rejected. Reason: ${adminNotes}`,
        relatedId: booking._id
      });
      io.emitCounts(booking.guideId.userId);
    }

    res.json({
      message: 'Payment rejected successfully',
      booking
    });

  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/admin/payment-bookings/:bookingId/proof
 * Fetch payment proof details for a booking
 */
router.get('/payment-bookings/:bookingId/proof', protect, adminOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('guideId')
      .populate('guideId.userId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.paymentRequest || !booking.paymentRequest.proofId) {
      return res.status(404).json({ message: 'No payment proof found for this booking' });
    }

    const proof = await PaymentProof.findById(booking.paymentRequest.proofId)
      .populate('guideUserId', 'fullName username email phone');

    if (!proof) {
      return res.status(404).json({ message: 'Payment proof not found' });
    }

    res.json({
      booking,
      proof,
    });
  } catch (error) {
    console.error('Error fetching booking proof:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/admin/payment-proofs/:proofId/screenshot
 * Directly serve the payment proof screenshot file
 */
router.get('/payment-proofs/:proofId/screenshot', protect, adminOnly, async (req, res) => {
  try {
    const proof = await PaymentProof.findById(req.params.proofId);

    if (!proof) {
      return res.status(404).json({ message: 'Payment proof not found' });
    }

    const fs = require('fs');
    const path = require('path');
    
    // Construct file path: /backend/uploads/payment-proofs/payment_xxxxx.jpg
    const filePath = path.join(__dirname, '..', proof.paymentScreenshot);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Screenshot file not found' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving screenshot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;