const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Feature Request", "Bug Report", "Destination Suggestion", "Guide Issue", "Other"],
      default: "Other",
    },
    message: { type: String, required: true },
    status: { type: String, enum: ["pending", "reviewed", "resolved"], default: "pending" },
    adminReply: { type: String, default: "" },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);