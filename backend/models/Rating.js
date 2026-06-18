const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
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
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
    },
    { timestamps: true }
);

// One rating per user per destination
ratingSchema.index({ user: 1, destination: 1 }, { unique: true });

// Helper to recalculate and push avg to Destination
async function updateDestinationRating(destinationId) {
    const Destination = mongoose.model("Destination");

    const result = await mongoose.model("Rating").aggregate([
        { $match: { destination: destinationId } },
        {
            $group: {
                _id: "$destination",
                avgRating: { $avg: "$rating" },
                totalRatings: { $sum: 1 },
            },
        },
    ]);

    if (result.length > 0) {
        await Destination.findByIdAndUpdate(destinationId, {
            avgRating: Math.round(result[0].avgRating * 10) / 10,
            totalRatings: result[0].totalRatings,
        });
    } else {
        await Destination.findByIdAndUpdate(destinationId, {
            avgRating: 0,
            totalRatings: 0,
        });
    }
}

// Fires on create & update
ratingSchema.post("save", async function () {
    await updateDestinationRating(this.destination);
});

// Fires on findOneAndDelete
ratingSchema.post("findOneAndDelete", async function (doc) {
    if (doc) await updateDestinationRating(doc.destination);
});

// Fires on findOneAndUpdate
ratingSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) await updateDestinationRating(doc.destination);
});

module.exports = mongoose.model("Rating", ratingSchema);