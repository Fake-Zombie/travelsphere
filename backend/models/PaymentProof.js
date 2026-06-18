const mongoose = require('mongoose');

const paymentProofSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GuideApplication',
      required: true
    },
    guideUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentScreenshot: {
      type: String,
      required: true // Path to uploaded screenshot file
    },
    paymentNotes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who verified
      default: null
    },
    adminNotes: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

// Indexes for faster queries
paymentProofSchema.index({ bookingId: 1 });
paymentProofSchema.index({ guideUserId: 1, status: 1 });
paymentProofSchema.index({ status: 1, submittedAt: -1 });

const PaymentProof = mongoose.model('PaymentProof', paymentProofSchema);

module.exports = PaymentProof;