const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    message: { type: String, required: true },
    title: { type: String, default: "" },
    type: { 
      type: String, 
      enum: [
        "request", 
        "application", 
        "review", 
        "mention", 
        "post_like", 
        "post_comment",
        "booking_request",
        "booking_approved",
        "booking_rejected",
        "counter_offer",
        "booking_message",
        'booking_completed',
        'completion_requested',
        'payment_submitted',    
        'payment_verified',   
        'payment_rejected'
      ], 
      required: true 
    },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
    relatedReview: { type: mongoose.Schema.Types.ObjectId, ref: "Review", default: null },
    relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }, // for booking, post, etc
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);