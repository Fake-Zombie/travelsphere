const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        destination: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Destination",
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        replies: [replySchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);