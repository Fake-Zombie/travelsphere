const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    country: {
  type: String,
  required: false,
  default: "",
  trim: true,
},
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },
    role: {
      type: String,
      enum: ["user", "guide", "admin"],
      default: "user"
    },
    isGuideApproved: {
      type: Boolean,
      default: false
    },
    profile_pic: {
      type: String,
      default: "",
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Destination",
      },
    ],
    // UPI ID for payment (guides)
    upiId: {
      type: String,
      default: '',
      sparse: true
    },
    // Guide stats for tracking earnings and performance
    guideStats: {
      totalBookingsCompleted: {
        type: Number,
        default: 0
      },
      totalEarnings: {
        type: Number,
        default: 0
      },
      averageRating: {
        type: Number,
        default: 0
      },
      totalReviews: {
        type: Number,
        default: 0
      },
      hoursWorked: {
        type: Number,
        default: 0
      },
      lastWorkedDate: {
        type: Date,
        default: null
      },
      completionRate: {
        type: Number,
        default: 0
      }, // percentage of accepted bookings completed
      pendingPayments: {
        type: Number,
        default: 0
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);