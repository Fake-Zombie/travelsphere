const mongoose = require("mongoose");

const guideApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    fullName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    languages: {
      type: [String],
      required: true
    },
    experience: {
      type: String,
      required: true
    },
    specialties: {
      type: [String]
    },
    bio: {
      type: String,
      required: true
    },
    pricePerDay: {
      type: Number,
      required: true
    },
    idProofImage: {
      type: String,
      required: true
    },
    selfieImage: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuideApplication", guideApplicationSchema);