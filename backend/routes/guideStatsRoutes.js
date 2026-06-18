const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Rating = require('../models/Rating');
const GuideApplication = require('../models/GuideApplication');
const Review = require('../models/Review');
const { protect } = require('../middleware/authMiddleware');

// Get guide stats and ratings
router.get('/stats', protect, async (req, res) => {
  try {

    // Get the guide application for this user
    const guideApp = await GuideApplication.findOne({ userId: req.user._id });
    console.log('✓ Guide App Found:', !!guideApp, guideApp?._id);

    if (!guideApp) {
      return res.status(404).json({ message: 'Not a guide' });
    }

    // Get all bookings for this guide
    const allBookings = await Booking.find({ guideId: guideApp._id });
    console.log('\n📊 Total Bookings:', allBookings.length);

    // Calculate stats
    const stats = {
      totalBookings: allBookings.length,
      completedBookings: 0,
      acceptedBookings: 0,
      rejectedBookings: 0,
      pendingBookings: 0,
      completionRate: 0,
      totalEarnings: 0,
      totalHoursWorked: 0,
      averageRating: 0,
      totalReviews: 0,
      lastWorkedDate: null
    };

    // Count bookings by status
    allBookings.forEach(b => {
      if (b.status === 'completed') stats.completedBookings++;
      if (b.status === 'accepted') stats.acceptedBookings++;
      if (b.status === 'rejected') stats.rejectedBookings++;
      if (b.status === 'pending') stats.pendingBookings++;
    });

    console.log('├─ Completed:', stats.completedBookings);
    console.log('├─ Accepted:', stats.acceptedBookings);
    console.log('├─ Rejected:', stats.rejectedBookings);
    console.log('└─ Pending:', stats.pendingBookings);

    // Calculate completion rate
    if (stats.totalBookings > 0) {
      stats.completionRate = Math.round(
        (stats.completedBookings / stats.totalBookings) * 100
      );
    }
    console.log('✓ Completion Rate:', stats.completionRate + '%');

    // Get completed bookings
    const completedBookings = allBookings.filter(b => b.status === 'completed');
    console.log('\n💰 EARNINGS CALCULATION:');

    // Calculate earnings and hours from completed bookings
    completedBookings.forEach((booking, idx) => {
      console.log(`\n  Booking ${idx + 1}:`);
      console.log(`  ├─ ID: ${booking._id}`);
      console.log(`  ├─ Has completionDetails: ${!!booking.completionDetails}`);

      if (booking.completionDetails) {
        const amount = booking.completionDetails.amountPaid || 0;
        const hours = booking.completionDetails.timeSpent || 0;
        
        console.log(`  ├─ Amount Paid: $${amount}`);
        console.log(`  ├─ Hours Worked: ${hours}h`);
        console.log(`  └─ Completed At: ${booking.completedAt}`);

        stats.totalEarnings += amount;
        stats.totalHoursWorked += hours;

        const workDate = new Date(booking.completedAt);
        if (!stats.lastWorkedDate || workDate > stats.lastWorkedDate) {
          stats.lastWorkedDate = workDate;
        }
      } else {
        console.log(`  └─ ⚠️ No completionDetails found`);
      }
    });

    console.log('\n✓ Total Earnings: $' + stats.totalEarnings);
    console.log('✓ Total Hours: ' + stats.totalHoursWorked + 'h');

    // Get ratings from completed bookings
    console.log('\n⭐ RATINGS CALCULATION:');
    let totalRating = 0;
    let ratingCount = 0;

    completedBookings.forEach((booking, idx) => {
      if (booking.completionDetails && booking.completionDetails.guideRating) {
        const rating = booking.completionDetails.guideRating.rating || 0;
        console.log(`  Booking ${idx + 1}: ${rating} stars`);
        totalRating += rating;
        ratingCount += 1;
      }
    });

    if (ratingCount > 0) {
      stats.averageRating = (totalRating / ratingCount).toFixed(1);
      stats.totalReviews = ratingCount;
      console.log(`✓ Average Rating: ${stats.averageRating}/5 (${ratingCount} reviews)`);
    } else {
      console.log('✓ No ratings yet');
    }

    // Try separate Rating model as fallback
    try {
      const ratings = await Rating.find({ guideId: guideApp._id });
      if (ratings.length > 0) {
        console.log('\n📌 Found separate Rating records:', ratings.length);
        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        stats.averageRating = avgRating.toFixed(1);
        stats.totalReviews = ratings.length;
      }
    } catch (err) {
      console.log('✓ Rating model not available or no records');
    }


    res.json({
      stats,
      guideId: guideApp._id,
      guideName: guideApp.fullName || guideApp.name || req.user.fullName
    });
  } catch (error) {
    console.error('❌ Error fetching guide stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get guide's completed bookings with details
router.get('/completed-bookings', protect, async (req, res) => {
  try {
    const guideApp = await GuideApplication.findOne({ userId: req.user._id });

    if (!guideApp) {
      return res.status(404).json({ message: 'Not a guide' });
    }

    const completedBookings = await Booking.find({
      guideId: guideApp._id,
      status: 'completed'
    })
      .populate(['userId', 'destinationId'])
      .sort({ completedAt: -1 });

    res.json(completedBookings);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add rating to a completed booking (from guide perspective)
router.post('/:bookingId/add-rating', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await Booking.findById(req.params.bookingId)
      .populate(['userId', 'guideId']);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if guide is authorized
    const guideApp = await GuideApplication.findById(booking.guideId._id);
    if (!guideApp || guideApp.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed bookings' });
    }

    // Add rating to booking - NESTED IN completionDetails
    if (!booking.completionDetails) {
      booking.completionDetails = {};
    }

    booking.completionDetails.guideRating = {
      rating: Number(rating),
      comment: comment || '',
      ratedAt: new Date(),
      ratedBy: req.user._id
    };

    await booking.save();

    // Emit notification to traveler
    const Notification = require('../models/Notification');
    const notification = new Notification({
      userId: booking.userId._id,
      type: 'guide_rating',
      title: 'Guide Feedback Received',
      message: `${req.user.fullName} left a ${rating}-star rating for your booking`,
      relatedId: booking._id,
      sender: req.user._id,
      read: false
    });
    await notification.save();

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.sendNotification(booking.userId._id, {
        type: 'guide_rating',
        title: 'Guide Feedback Received',
        message: `${req.user.fullName} left a ${rating}-star rating for your booking`,
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

// Get guide profile with stats (public endpoint for viewing guide profiles)
router.get('/profile/:guideId', async (req, res) => {
  try {
    const guideApp = await GuideApplication.findById(req.params.guideId)
      .populate('userId', 'fullName username profile_pic');

    if (!guideApp) {
      return res.status(404).json({ message: 'Guide not found' });
    }

    const bookings = await Booking.find({ guideId: req.params.guideId });
    const completedBookings = bookings.filter(b => b.status === 'completed');

    // Calculate stats
    let totalRating = 0;
    let ratingCount = 0;
    let totalEarnings = 0;
    let totalHours = 0;

    completedBookings.forEach(booking => {
      if (booking.completionDetails && booking.completionDetails.guideRating) {
        totalRating += booking.completionDetails.guideRating.rating;
        ratingCount += 1;
      }
      if (booking.completionDetails) {
        totalEarnings += booking.completionDetails.amountPaid || 0;
        totalHours += booking.completionDetails.timeSpent || 0;
      }
    });

    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;

    res.json({
      guide: guideApp,
      stats: {
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        completionRate: bookings.length > 0 
          ? Math.round((completedBookings.length / bookings.length) * 100)
          : 0,
        averageRating: parseFloat(averageRating),
        totalReviews: ratingCount,
        totalEarnings,
        totalHoursWorked: totalHours
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;