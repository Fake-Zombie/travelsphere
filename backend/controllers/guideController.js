const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const GuideApplication = require("../models/GuideApplication");
const User = require("../models/User");

exports.applyGuide = async (req, res) => {
  try {
    // Prevent duplicate application
    const existing = await GuideApplication.findOne({
      userId: req.user.id,
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Application already submitted" });
    }

    // Check files
    if (!req.files.idProofImage || !req.files.selfieImage) {
      return res
        .status(400)
        .json({ message: "ID proof and selfie are required" });
    }

    const application = new GuideApplication({
      userId: req.user.id,
      fullName: req.body.fullName,
      phone: req.body.phone,
      city: req.body.city,
      country: req.body.country,
      languages: req.body.languages,
      experience: req.body.experience,
      specialties: req.body.specialties,
      bio: req.body.bio,
      pricePerDay: req.body.pricePerDay,
      idProofImage: req.files.idProofImage[0].path,
      selfieImage: req.files.selfieImage[0].path,
    });

    await application.save();
    const admins = await User.find({ role: "admin" }).select("_id");
    await Notification.insertMany(admins.map(admin => ({
      userId: admin._id,
      message: `${req.body.fullName} submitted a guide application.`,
      type: "application",
      link: "/admin"
    })));

    res.json({ message: "Guide application submitted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET all applications (admin only)
exports.getAllApplications = async (req, res) => {
  try {
    const applications = await GuideApplication.find().populate("userId", "email username");
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// APPROVE application
exports.approveApplication = async (req, res) => {
  try {
    const application = await GuideApplication.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Update user role to guide
    await User.findByIdAndUpdate(application.userId, {
      role: "guide",
      isGuideApproved: true
    });

    // Create notification BEFORE sending response
    await Notification.create({
      recipient: application.userId,
      message: "Your guide application has been approved! You are now a guide.",
      type: "application",
      link: "/guide-dashboard"
    });

    res.json({ message: "Application approved", application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REJECT application
exports.rejectApplication = async (req, res) => {
  try {
    const application = await GuideApplication.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Create notification BEFORE sending response
    await Notification.create({
      recipient: application.userId,
      message: "Your guide application was not approved at this time.",
      type: "application",
      link: "/applications"
    });

    res.json({ message: "Application rejected", application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE BOOKING
exports.createBooking = async (req, res) => {
  try {
    const { guideId, destinationId, startDate, endDate, partySize, budgetRange, notes } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!guideId || !destinationId || !startDate || !endDate || !partySize) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    if (partySize < 1) {
      return res.status(400).json({ message: 'Party size must be at least 1' });
    }

    // Create booking
    const booking = new Booking({
      guideId,
      userId,
      destinationId,
      startDate: start,
      endDate: end,
      partySize,
      budgetRange: budgetRange || { min: 0, max: 0 },
      notes: notes || '',
      status: 'pending'
    });

    await booking.save();

    // Create notification for guide
    const notification = new Notification({
      userId: guideId,
      type: 'booking_request',
      message: `New booking request from ${req.user.username}`,
      relatedId: booking._id,
      isRead: false
    });

    await notification.save();

    // Emit socket event to guide (if online)
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${guideId}`).emit('notification:new', {
        _id: notification._id,
        type: 'booking_request',
        message: notification.message,
        relatedId: booking._id
      });
    }

    res.status(201).json({
      _id: booking._id,
      status: 'pending',
      message: 'Booking request sent to guide'
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: err.message });
  }
};