const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GuideApplication',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Destination',
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    partySize: {
      type: Number,
      required: true,
      min: 1
    },
    budgetRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 0
      }
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending'
    },
    // Guide approval/rejection messages
    approvalMessage: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    // Counter offer from guide
    counterOffer: {
      suggestedDates: {
        start: Date,
        end: Date
      },
      suggestedPrice: {
        min: Number,
        max: Number
      },
      message: String
    },
    // Counter offer response from user
    counterOfferAccepted: {
      type: Boolean,
      default: false
    },
    counterOfferRejected: {
      type: Boolean,
      default: false
    },
    counterOfferRejectionReason: {
      type: String,
      default: ''
    },
    // Booking completion workflow
    completionRequested: {
      type: Boolean,
      default: false
    },
    completionRequestedAt: {
      type: Date,
      default: null
    },
    completionDetails: {
      paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'other'],
        default: null
      },
      amountPaid: {
        type: Number,
        default: 0
      },
      timeSpent: {
        type: Number,
        default: 0
      }, // in hours
      currency: {
        type: String,
        default: 'USD'
      },
      guideRating: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        ratedAt: Date,
        ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      },
      feedback: {
        type: String,
        default: ''
      },
      travelersNotes: {
        type: String,
        default: ''
      },
      confirmationDate: {
        type: Date,
        default: null
      }
    },
    completedAt: {
      type: Date,
      default: null
    },
    // Payment request (20% of amountPaid from completionDetails)
    paymentRequest: {
  status: {
    type: String,
    enum: ['pending', 'submitted', 'paid', 'rejected'],  // ✅ Added 'submitted'
    default: 'pending'
  },
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  createdAt: {
    type: Date,
    default: null
  },
  submittedAt: {
    type: Date,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  proofId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentProof',
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  adminNotes: {
    type: String,
    default: ''
  }
}
  },
  { timestamps: true }
);

// Index for faster queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ guideId: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'paymentRequest.status': 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;