const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const PaymentProof = require('../models/PaymentProof');
const GuideApplication = require('../models/GuideApplication');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/paymentUploadMiddleware');

// ========== GUIDE PAYMENT ENDPOINTS ==========

// GET /api/guides/payment-bookings/pending - Pending payments for guide
router.get('/payment-bookings/pending', protect, async (req, res) => {
  try {
    const guideApp = await GuideApplication.findOne({ userId: req.user._id });

    if (!guideApp) {
      return res.json({ bookings: [], totalAmount: 0 });
    }

    const bookings = await Booking.find({
      guideId: guideApp._id,
      status: 'completed',
      'paymentRequest.status': 'pending'
    })
      .populate([
        { path: 'userId', select: 'fullName' },
        { path: 'destinationId', select: 'name' }
      ])
      .sort({ 'paymentRequest.createdAt': -1 });

    // Calculate total pending amount
    const totalAmount = bookings.reduce((sum, booking) => {
      return sum + (booking.paymentRequest?.amount || 0);
    }, 0);

    res.json({
      bookings,
      totalAmount: totalAmount.toFixed(2),
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/guides/payment-bookings/history - Payment history (paid + rejected)
router.get('/payment-bookings/history', protect, async (req, res) => {
  try {
    const guideApp = await GuideApplication.findOne({ userId: req.user._id });

    if (!guideApp) {
      return res.json({ bookings: [], totalPaid: 0, totalRejected: 0 });
    }

    const bookings = await Booking.find({
      guideId: guideApp._id,
      status: 'completed',
      $or: [
        { 'paymentRequest.status': 'paid' },
        { 'paymentRequest.status': 'rejected' }
      ]
    })
      .populate([
        { path: 'userId', select: 'fullName' },
        { path: 'destinationId', select: 'name' },
        { path: 'paymentRequest.verifiedBy', select: 'fullName' }
      ])
      .sort({ 'paymentRequest.paidAt': -1, 'completedAt': -1 });

    // Calculate totals
    const totalPaid = bookings
      .filter(b => b.paymentRequest?.status === 'paid')
      .reduce((sum, booking) => sum + (booking.paymentRequest?.amount || 0), 0);

    const totalRejected = bookings
      .filter(b => b.paymentRequest?.status === 'rejected')
      .reduce((sum, booking) => sum + (booking.paymentRequest?.amount || 0), 0);

    res.json({
      bookings,
      totalPaid: totalPaid.toFixed(2),
      totalRejected: totalRejected.toFixed(2),
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== PAYMENT PROOF SUBMISSION ==========

/**
 * POST /api/guides/payment-bookings/:bookingId/submit-proof
 * Guide submits payment screenshot proof for a booking
/**
 * POST /api/guides/payment-bookings/:bookingId/submit-proof
 * Guide submits payment screenshot proof for a booking
 * PROPERLY STORES FILE PATH
 */
router.post('/payment-bookings/:bookingId/submit-proof', protect, upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentNotes } = req.body;

    console.log('=== PAYMENT PROOF UPLOAD ===');
    console.log('File received:', req.file ? 'YES' : 'NO');
    console.log('File details:', req.file);

    // Validate file upload
    if (!req.file) {
      return res.status(400).json({ message: 'Payment screenshot is required' });
    }

    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate(['guideId', 'userId', 'destinationId']);

    if (!booking) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the guide
    const guideApp = await GuideApplication.findById(booking.guideId._id);
    if (!guideApp || guideApp.userId.toString() !== req.user._id.toString()) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to submit proof for this booking' });
    }

    // Check booking is completed with pending payment
    if (booking.status !== 'completed' || booking.paymentRequest?.status !== 'pending') {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid booking or payment status' });
    }

    // Create payment proof record
    // STORE: uploads/payment-proofs/payment_xxxxx.jpg
    const relativePath = `uploads/payment-proofs/${req.file.filename}`;
    
    console.log('Storing path:', relativePath);
    console.log('File exists at:', req.file.path, require('fs').existsSync(req.file.path));

    const paymentProof = new PaymentProof({
      bookingId: booking._id,
      guideId: guideApp._id,
      guideUserId: req.user._id,
      amount: booking.paymentRequest.amount,
      currency: booking.paymentRequest.currency,
      paymentScreenshot: relativePath,  // ✅ STORE RELATIVE PATH
      paymentNotes: paymentNotes || '',
      status: 'pending',
      submittedAt: new Date()
    });

    await paymentProof.save();

    // Update booking payment request status to 'submitted'
    booking.paymentRequest.status = 'submitted';
    booking.paymentRequest.proofId = paymentProof._id;
    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: req.user._id,
      type: 'payment_submitted',
      title: '✓ Payment Proof Submitted',
      message: `Your payment proof for ${booking.paymentRequest.currency} ${booking.paymentRequest.amount.toFixed(2)} has been submitted. Admin will verify it shortly.`,
      relatedId: booking._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(req.user._id, {
        type: 'payment_submitted',
        title: '✓ Payment Proof Submitted',
        message: `Your payment proof for ${booking.paymentRequest.currency} ${booking.paymentRequest.amount.toFixed(2)} has been submitted. Admin will verify it shortly.`,
        relatedId: booking._id
      });
      io.emitCounts(req.user._id);
    }

    res.json({
      message: 'Payment proof submitted successfully',
      paymentProof
    });

  } catch (error) {
    console.error('Error submitting payment proof:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting file:', e);
      }
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ========== ADMIN PAYMENT VERIFICATION ==========

/**
 * GET /api/guides/payment-proofs/pending
 * Admin fetches all pending payment proofs awaiting verification
 */
router.get('/payment-proofs/pending', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const proofs = await PaymentProof.find({ status: 'pending' })
      .populate('guideUserId', 'fullName username email')
      .populate('bookingId', 'startDate endDate')
      .populate('destinationId', 'name')
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
 * GET /api/guides/payment-proofs/:proofId
 * Admin views specific payment proof details
 */
router.get('/payment-proofs/:proofId', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

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
 * PUT /api/guides/payment-proofs/:proofId/verify
 * Admin verifies a payment and marks booking payment as paid
 * 
 * Body:
 * - adminNotes: String (optional verification notes)
 */
router.put('/payment-proofs/:proofId/verify', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { adminNotes } = req.body;
    const proof = await PaymentProof.findById(req.params.proofId)
      .populate('bookingId')
      .populate('guideUserId');

    if (!proof) {
      return res.status(404).json({ message: 'Payment proof not found' });
    }

    if (proof.status !== 'pending') {
      return res.status(400).json({ message: 'Payment proof is not pending' });
    }

    // Update proof
    proof.status = 'verified';
    proof.verifiedAt = new Date();
    proof.verifiedBy = req.user._id;
    proof.adminNotes = adminNotes || '';
    await proof.save();

    // Update booking payment status
    const booking = proof.bookingId;
    booking.paymentRequest.status = 'paid';
    booking.paymentRequest.paidAt = new Date();
    booking.paymentRequest.verifiedBy = req.user._id;
    booking.paymentRequest.adminNotes = adminNotes || '';
    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: proof.guideUserId._id,
      type: 'payment_verified',
      title: '💰 Payment Verified!',
      message: `Your payment of ${proof.currency} ${proof.amount.toFixed(2)} has been verified and processed.`,
      relatedId: booking._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(proof.guideUserId._id, {
        type: 'payment_verified',
        title: '💰 Payment Verified!',
        message: `Your payment of ${proof.currency} ${proof.amount.toFixed(2)} has been verified and processed.`,
        relatedId: booking._id
      });
      io.emitCounts(proof.guideUserId._id);
    }

    res.json({
      message: 'Payment verified successfully',
      proof
    });

  } catch (error) {
    console.error('Error verifying payment proof:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * PUT /api/guides/payment-proofs/:proofId/reject
 * Admin rejects a payment proof
 * 
 * Body:
 * - rejectionReason: String (why the payment was rejected)
 */
router.put('/payment-proofs/:proofId/reject', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const proof = await PaymentProof.findById(req.params.proofId)
      .populate('bookingId')
      .populate('guideUserId');

    if (!proof) {
      return res.status(404).json({ message: 'Payment proof not found' });
    }

    if (proof.status !== 'pending') {
      return res.status(400).json({ message: 'Payment proof is not pending' });
    }

    // Update proof
    proof.status = 'rejected';
    proof.verifiedAt = new Date();
    proof.verifiedBy = req.user._id;
    proof.rejectionReason = rejectionReason;
    await proof.save();

    // Revert booking payment status back to pending
    const booking = proof.bookingId;
    booking.paymentRequest.status = 'pending';
    booking.paymentRequest.adminNotes = rejectionReason;
    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: proof.guideUserId._id,
      type: 'payment_rejected',
      title: '❌ Payment Proof Rejected',
      message: `Your payment proof was rejected. Reason: ${rejectionReason}. Please resubmit with correct details.`,
      relatedId: booking._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(proof.guideUserId._id, {
        type: 'payment_rejected',
        title: '❌ Payment Proof Rejected',
        message: `Your payment proof was rejected. Reason: ${rejectionReason}. Please resubmit with correct details.`,
        relatedId: booking._id
      });
      io.emitCounts(proof.guideUserId._id);
    }

    res.json({
      message: 'Payment proof rejected',
      proof
    });

  } catch (error) {
    console.error('Error rejecting payment proof:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;