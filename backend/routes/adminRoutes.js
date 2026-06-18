const express = require("express");
const router = express.Router();
const User = require("../models/User");
const GuideApplication = require("../models/GuideApplication");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// Get all users
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all guides
router.get("/guides", protect, adminOnly, async (req, res) => {
  try {
    const guides = await GuideApplication.find({ status: "approved" }).populate("userId", "username email");
    res.json(guides);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user - also delete their guide application
router.delete("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Delete associated guide application
    await GuideApplication.deleteMany({ userId: req.params.id });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete guide application - also update user role
router.delete("/guides/:id", protect, adminOnly, async (req, res) => {
  try {
    const guide = await GuideApplication.findByIdAndDelete(req.params.id);
    if (!guide) {
      return res.status(404).json({ message: "Guide not found" });
    }
    // Update user - remove guide status
    await User.findByIdAndUpdate(guide.userId, { role: "user", isGuideApproved: false });
    res.json({ message: "Guide deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Promote user to admin
router.put("/make-admin/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "admin";
    await user.save();

    res.json({ message: "User promoted to admin" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Demote admin to user
router.put("/demote-admin/:id", protect, adminOnly, async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: "admin" });

    if (adminCount <= 1) {
      return res.status(400).json({ message: "Must have at least 1 admin" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = "user";
    await user.save();

    res.json({ message: "User demoted from admin" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Demote guide to user
router.put("/demote-guide/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: "user", isGuideApproved: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Guide demoted to user" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Edit guide details
router.put("/guides/:id", protect, adminOnly, async (req, res) => {
  try {
    const { fullName, phone, city, country, languages, experience, specialties, bio, pricePerDay } = req.body;
    const guide = await GuideApplication.findByIdAndUpdate(
      req.params.id,
      { fullName, phone, city, country, languages, experience, specialties, bio, pricePerDay },
      { new: true }
    );
    if (!guide) return res.status(404).json({ message: "Guide not found" });

    // Sync fullName and country to User model
    await User.findByIdAndUpdate(guide.userId, { fullName, country });

    res.json(guide);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================
// WEEKLY PAYMENT ENDPOINTS (NEW)
// ============================================

/**
 * GET /api/admin/weekly-payments
 * Fetch all weekly payments (pending and verified)
 * Admin only
 */
router.get("/weekly-payments", protect, adminOnly, async (req, res) => {
  try {
    const payments = await WeeklyPayment.find()
      .populate("guideId", "fullName bio pricePerDay")
      .populate("guideUserId", "username email")
      .populate("bookingIds", "startDate endDate status")
      .populate("verifiedBy", "username")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error("Error fetching weekly payments:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/admin/weekly-payments/:id
 * Fetch single weekly payment details
 * Admin only
 */
router.get("/weekly-payments/:id", protect, adminOnly, async (req, res) => {
  try {
    const payment = await WeeklyPayment.findById(req.params.id)
      .populate("guideId", "fullName bio pricePerDay city country")
      .populate("guideUserId", "username email")
      .populate("bookingIds", "startDate endDate status userId")
      .populate("verifiedBy", "username");

    if (!payment) {
      return res.status(404).json({ message: "Weekly payment not found" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Error fetching weekly payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/admin/weekly-payments/:id/verify
 * Admin verifies and marks payment as paid
 * Changes status: pending → paid
 * Admin only
 */
router.put("/weekly-payments/:id/verify", protect, adminOnly, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const paymentId = req.params.id;

    // Find payment
    const payment = await WeeklyPayment.findById(paymentId).populate("guideUserId", "username");

    if (!payment) {
      return res.status(404).json({ message: "Weekly payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: `Cannot verify payment with status: ${payment.status}`
      });
    }

    // Update payment
    payment.status = "paid";
    payment.paidAt = new Date();
    payment.verifiedBy = req.user._id;
    if (adminNotes) {
      payment.adminNotes = adminNotes;
    }

    await payment.save();

    // Emit socket notification to guide
    const io = req.app.get("io");
    if (io) {
      io.to(payment.guideUserId._id.toString()).emit("notification:payment_verified", {
        type: "payment_verified",
        title: "Payment Verified ✓",
        message: `Your weekly payment of ${payment.currency} ${payment.totalAmount.toFixed(2)} has been verified.`,
        metadata: {
          paymentId: payment._id,
          amount: payment.totalAmount,
          week: `${new Date(payment.weekStartDate).toLocaleDateString()} - ${new Date(
            payment.weekEndDate
          ).toLocaleDateString()}`
        }
      });
    }

    res.json({
      message: "Payment verified successfully",
      payment
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/admin/weekly-payments/:id/reject
 * Admin rejects payment and resets status to pending
 * Guide will be notified to resubmit proof
 * Admin only
 */
router.put("/weekly-payments/:id/reject", protect, adminOnly, async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const paymentId = req.params.id;

    // Find payment
    const payment = await WeeklyPayment.findById(paymentId).populate("guideUserId", "username");

    if (!payment) {
      return res.status(404).json({ message: "Weekly payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        message: `Cannot reject payment with status: ${payment.status}`
      });
    }

    // Update payment - reset to pending
    payment.status = "pending";
    payment.adminNotes = adminNotes || "Payment rejected. Please resubmit with valid proof.";
    payment.verifiedBy = null;

    await payment.save();

    // Emit socket notification to guide
    const io = req.app.get("io");
    if (io) {
      io.to(payment.guideUserId._id.toString()).emit("notification:payment_rejected", {
        type: "payment_rejected",
        title: "Payment Rejected ✗",
        message: `Your payment submission was rejected. ${payment.adminNotes}`,
        metadata: {
          paymentId: payment._id,
          amount: payment.totalAmount,
          reason: payment.adminNotes
        }
      });
    }

    res.json({
      message: "Payment rejected. Guide has been notified.",
      payment
    });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;