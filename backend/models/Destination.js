const mongoose = require("mongoose");

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    avgRating: {
      type: Number,
      default: 0,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    favoritesCount: {
      type: Number,
      default: 0,
    },

    type: {
      type: String,
      default: "Other",
    },

    bestTimeToVisit: {
      months: {
        type: String,
        default: "",  
      },
      reason: {
        type: String,
        default: "",   
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Destination", destinationSchema);