const express = require("express");
const router = express.Router();
const upload = require("../middleware/guideUploadMiddleware");
const {
  applyGuide,
  getAllApplications,
  approveApplication,
  rejectApplication,
  createBooking
} = require("../controllers/guideController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const GuideApplication = require("../models/GuideApplication");
const Destination = require("../models/Destination");
const Booking = require("../models/Booking");

// Submit application
router.post(
  "/apply",
  protect,
  upload.fields([
    { name: "idProofImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 }
  ]),
  applyGuide
);

// Get all applications (admin only)
router.get("/applications", protect, adminOnly, getAllApplications);

// Approve application (admin only)
router.patch("/applications/:id/approve", protect, adminOnly, approveApplication);

// Reject application (admin only)
router.patch("/applications/:id/reject", protect, adminOnly, rejectApplication);

// Get own application
router.get("/my-application", protect, async (req, res) => {
  try {
    const application = await GuideApplication.findOne({ userId: req.user._id });
    res.json(application || null);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get guides for a destination
router.get("/destination/:destinationId", async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.destinationId);
    if (!destination) return res.status(404).json({ message: "Not found" });

    const guides = await GuideApplication.find({
      status: "approved",
      country: { $regex: new RegExp(destination.country, "i") }
    }).populate("userId", "username profile_pic");

    res.json(guides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create booking request
router.post("/booking/create", protect, createBooking);


router.get("/weekly-payments", protect, async (req, res) => {
  try {
    const guideId = req.user._id;

    // Find guide application to verify they are a guide
    const guideApp = await GuideApplication.findOne({ userId: guideId });

    if (!guideApp) {
      return res.status(403).json({ message: "Not a verified guide" });
    }

    // Fetch all weekly payments for this guide
    const payments = await WeeklyPayment.find({ guideUserId: guideId })
      .populate("guideId", "fullName")
      .populate("bookingIds", "status startDate endDate")
      .sort({ weekStartDate: -1 });

    res.json(payments);
  } catch (error) {
    console.error("Error fetching weekly payments:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/guides/weekly-payments/:id
 * Guide fetches specific weekly payment details
 * Only guide who owns the payment can view it
 */
router.get("/weekly-payments/:id", protect, async (req, res) => {
  try {
    const payment = await WeeklyPayment.findById(req.params.id)
      .populate("guideId", "fullName")
      .populate("guideUserId", "username email")
      .populate("bookingIds", "status startDate endDate userId")
      .populate("verifiedBy", "username");

    if (!payment) {
      return res.status(404).json({ message: "Weekly payment not found" });
    }

    // Verify guide owns this payment
    if (payment.guideUserId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Error fetching weekly payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/guides/stats
 * Guide fetches their statistics
 * Total bookings, reviews, earnings, hours worked, etc.
 */
router.get("/stats", protect, async (req, res) => {
  try {
    const guideId = req.user._id;

    // Verify guide is approved
    const guideApp = await GuideApplication.findOne({ userId: guideId });
    if (!guideApp || guideApp.status !== "approved") {
      return res.status(403).json({ message: "Not an approved guide" });
    }

    // Get all bookings for this guide
    const bookings = await Booking.find({ guideId: guideApp._id });

    // Calculate stats
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const totalBookings = bookings.length;

    // Calculate total earnings (20% of booking prices)
    let totalEarnings = 0;
    let totalHoursWorked = 0;

    bookings.forEach((booking) => {
      if (booking.status === "completed") {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        const daysWorked = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const hoursWorked = daysWorked * 24;
        totalHoursWorked += hoursWorked;

        // Calculate earnings (20% of price per day × days)
        const earningsFromBooking = (guideApp.pricePerDay * daysWorked * 0.2);
        totalEarnings += earningsFromBooking;
      }
    });

    // Get reviews/ratings (if you have a Rating model)
    // For now, we'll use a placeholder
    const totalReviews = 0; // Update this based on your rating system

    res.json({
      stats: {
        totalBookings,
        completedBookings,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalHoursWorked,
        totalReviews
      }
    });
  } catch (error) {
    console.error("Error fetching guide stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;