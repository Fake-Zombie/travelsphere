const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect } = require('../middleware/authMiddleware');
const GuideApplication = require('../models/GuideApplication');
const Notification = require('../models/Notification');

// Create booking
router.post('/create', protect, async (req, res) => {
  try {
    const { guideId, destinationId, startDate, endDate, partySize, budgetRange, notes } = req.body;

    if (!guideId || !destinationId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const booking = new Booking({
      userId: req.user._id,
      guideId,
      destinationId,
      startDate,
      endDate,
      partySize,
      budgetRange,
      notes,
      status: 'pending'
    });

    await booking.save();
    await booking.populate(['userId', 'guideId', 'destinationId']);
    
    // Create notification for guide
    const guide = await GuideApplication.findById(guideId);
    if (guide) {
      const notification = new Notification({
        userId: guide.userId,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `${req.user.fullName} requested a booking for ${new Date(startDate).toLocaleDateString()}`,
        relatedId: booking._id,
        sender: req.user._id,
        read: false
      });
      await notification.save();

      // Emit socket notification
      const io = req.app.get('io');
      if (io) {
        io.sendNotification(guide.userId, {
          type: 'booking_request',
          title: 'New Booking Request',
          message: `${req.user.fullName} requested a booking for ${new Date(startDate).toLocaleDateString()}`,
          relatedId: booking._id
        });
        io.emitCounts(guide.userId);
      }
    }
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's bookings
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate(['guideId', 'destinationId'])
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get guide's booking requests
router.get('/guide-requests', protect, async (req, res) => {
  try {
    const guideApp = await GuideApplication.findOne({ userId: req.user._id });
    
    let bookings = [];
    if (guideApp) {
      bookings = await Booking.find({ guideId: guideApp._id })
        .populate(['userId', 'destinationId'])
        .sort({ createdAt: -1 });
    }
    
    res.json(bookings);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve booking
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'accepted',
        approvalMessage: message
      },
      { new: true }
    ).populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create notification for user
    const notification = new Notification({
      userId: booking.userId._id,
      type: 'booking_approved',
      title: 'Booking Approved! 🎉',
      message: `${req.user.fullName} approved your booking request for ${booking.destinationId.name}`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.userId._id, {
        type: 'booking_approved',
        title: 'Booking Approved! 🎉',
        message: `${req.user.fullName} approved your booking request for ${booking.destinationId.name}`,
        relatedId: booking._id
      });
      io.emitCounts(booking.userId._id);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject booking
router.put('/:id/reject', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        rejectionReason: message
      },
      { new: true }
    ).populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create notification for user
    const notification = new Notification({
      userId: booking.userId._id,
      type: 'booking_rejected',
      title: 'Booking Request Declined',
      message: message || `${req.user.fullName} declined your booking request`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.userId._id, {
        type: 'booking_rejected',
        title: 'Booking Request Declined',
        message: message || `${req.user.fullName} declined your booking request`,
        relatedId: booking._id
      });
      io.emitCounts(booking.userId._id);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send counter offer
router.put('/:id/counter-offer', protect, async (req, res) => {
  try {
    const { message, counterOffer } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'pending',
        counterOffer: {
          suggestedDates: counterOffer?.suggestedDates,
          suggestedPrice: counterOffer?.suggestedPrice,
          message: message
        }
      },
      { new: true }
    ).populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create notification for user
    const notification = new Notification({
      userId: booking.userId._id,
      type: 'counter_offer',
      title: 'Guide Sent Counter Offer',
      message: `${req.user.fullName} sent a counter offer for your booking`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.userId._id, {
        type: 'counter_offer',
        title: 'Guide Sent Counter Offer',
        message: `${req.user.fullName} sent a counter offer for your booking`,
        relatedId: booking._id
      });
      io.emitCounts(booking.userId._id);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept counter offer
router.put('/:id/accept-counter', protect, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'accepted',
        counterOfferAccepted: true
      },
      { new: true }
    ).populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create notification for guide
    const notification = new Notification({
      userId: booking.guideId.userId || booking.guideId._id,
      type: 'booking_approved',
      title: 'Counter Offer Accepted! 🎉',
      message: `${req.user.fullName} accepted your counter offer`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.guideId.userId || booking.guideId._id, {
        type: 'booking_approved',
        title: 'Counter Offer Accepted! 🎉',
        message: `${req.user.fullName} accepted your counter offer`,
        relatedId: booking._id
      });
      io.emitCounts(booking.guideId.userId || booking.guideId._id);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject counter offer
router.put('/:id/reject-counter', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        counterOfferRejected: true,
        counterOfferRejectionReason: message
      },
      { new: true }
    ).populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Create notification for guide
    const notification = new Notification({
      userId: booking.guideId.userId || booking.guideId._id,
      type: 'booking_rejected',
      title: 'Counter Offer Declined',
      message: message || `${req.user.fullName} declined your counter offer`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.guideId.userId || booking.guideId._id, {
        type: 'booking_rejected',
        title: 'Counter Offer Declined',
        message: message || `${req.user.fullName} declined your counter offer`,
        relatedId: booking._id
      });
      io.emitCounts(booking.guideId.userId || booking.guideId._id);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update booking status (generic)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate(['userId', 'guideId', 'destinationId']);

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== BOOKING COMPLETION WORKFLOW ENDPOINTS ==========

// Request completion (Guide initiates after booking.endDate passes)
router.post('/:id/request-completion', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the guide
    const guideApp = await GuideApplication.findById(booking.guideId._id);
    if (!guideApp || guideApp.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this booking' });
    }

    // Check booking status is accepted
    if (booking.status !== 'accepted') {
      return res.status(400).json({ message: 'Booking must be accepted to request completion' });
    }

    // Check current date >= booking.endDate
    const now = new Date();
    if (now < new Date(booking.endDate)) {
      return res.status(400).json({ message: 'Cannot request completion before booking end date' });
    }

    // Update booking
    booking.completionRequested = true;
    booking.completionRequestedAt = now;
    await booking.save();

    // Create notification for traveler
    const notification = new Notification({
      userId: booking.userId._id,
      type: 'completion_requested',
      title: 'Booking Completion Request',
      message: `${req.user.fullName} has requested to mark your booking as complete. Please confirm when you're ready.`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.userId._id, {
        type: 'completion_requested',
        title: 'Booking Completion Request',
        message: `${req.user.fullName} has requested to mark your booking as complete. Please confirm when you're ready.`,
        relatedId: booking._id
      });
      io.emitCounts(booking.userId._id);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error requesting completion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Confirm completion (Traveler confirms and provides completion details)
// **AUTO-CREATES PAYMENT REQUEST ON BOOKING**
router.put('/:id/confirm-completion', protect, async (req, res) => {
  try {
    const {
      paymentMethod,
      amountPaid,
      timeSpent,
      currency,
      feedback,
      travelersNotes,
      guideRating
    } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the traveler
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to complete this booking' });
    }

    // Check completionRequested = true
    if (!booking.completionRequested) {
      return res.status(400).json({ message: 'Guide has not requested completion yet' });
    }

    // Calculate 20% guide earnings
    const amountNumber = Number(amountPaid);
    const guideEarnings = amountNumber * 0.20;

    // Update booking with completion details
    booking.status = 'completed';
    booking.completionDetails = {
      paymentMethod,
      amountPaid: amountNumber,
      timeSpent: Number(timeSpent),
      currency: currency || 'USD',
      guideRating: {
        rating: Number(guideRating),
        comment: feedback || '',
        ratedAt: new Date(),
        ratedBy: req.user._id
      },
      feedback: feedback || '',
      travelersNotes: travelersNotes || '',
      confirmationDate: new Date()
    };

    // Create payment request on booking
    booking.paymentRequest = {
      status: 'pending',
      amount: guideEarnings,
      currency: currency || 'USD',
      createdAt: new Date()
    };

    booking.completedAt = new Date();
    await booking.save();

    // Update guide stats
    const guide = booking.guideId;
    if (guide) {
      const guideUser = await require('../models/User').findOne({ _id: guide.userId });
      if (guideUser) {
        // Initialize guideStats if missing
        if (!guideUser.guideStats) {
          guideUser.guideStats = {
            totalBookingsCompleted: 0,
            totalEarnings: 0,
            hoursWorked: 0,
            completionRate: 0,
            lastWorkedDate: null,
            pendingPayments: 0
          };
        }

        guideUser.guideStats.totalBookingsCompleted += 1;
        guideUser.guideStats.totalEarnings += guideEarnings;
        guideUser.guideStats.hoursWorked += Number(timeSpent);
        guideUser.guideStats.pendingPayments += guideEarnings;
        guideUser.guideStats.lastWorkedDate = new Date();

        // Calculate completion rate
        const allGuideBookings = await Booking.find({ guideId: guide._id });
        const acceptedCount = allGuideBookings.filter(
          b => b.status === 'accepted' || b.status === 'completed'
        ).length;
        const completedCount = allGuideBookings.filter(
          b => b.status === 'completed'
        ).length;

        guideUser.guideStats.completionRate =
          acceptedCount > 0
            ? (completedCount / acceptedCount) * 100
            : 0;

        await guideUser.save();
      }
    }

    // Create notification for guide about payment request
    const notification = new Notification({
      userId: guide.userId,
      type: 'booking_completed',
      title: '💰 Payment Request Created',
      message: `Booking completed! Payment request for ${currency || 'USD'} ${guideEarnings.toFixed(2)} awaiting admin verification.`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(guide.userId, {
        type: 'booking_completed',
        title: '💰 Payment Request Created',
        message: `Booking completed! Payment request for ${currency || 'USD'} ${guideEarnings.toFixed(2)} awaiting admin verification.`,
        relatedId: booking._id
      });
      io.emitCounts(guide.userId);
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel completion request (Traveler cancels if not ready)
router.put('/:id/cancel-completion', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user is the traveler
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check completionRequested = true
    if (!booking.completionRequested) {
      return res.status(400).json({ message: 'No completion request to cancel' });
    }

    // Reset completion request
    booking.completionRequested = false;
    booking.completionRequestedAt = null;
    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: booking.guideId.userId,
      type: 'booking_rejected',
      title: 'Completion Cancelled',
      message: `${req.user.fullName} cancelled the completion confirmation. They're not ready yet.`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.guideId.userId, {
        type: 'booking_rejected',
        title: 'Completion Cancelled',
        message: `${req.user.fullName} cancelled the completion confirmation. They're not ready yet.`,
        relatedId: booking._id
      });
      io.emitCounts(booking.guideId.userId);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error cancelling completion:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get completed booking details (for guide or traveler)
router.get('/:id/completion-details', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate(['userId', 'guideId', 'destinationId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization
    const isGuide = booking.guideId.userId.toString() === req.user._id.toString();
    const isTraveler = booking.userId._id.toString() === req.user._id.toString();

    if (!isGuide && !isTraveler) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Booking is not completed yet' });
    }

    res.json({
      booking,
      isGuide,
      isTraveler,
      completionDetails: booking.completionDetails,
      paymentRequest: booking.paymentRequest
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;