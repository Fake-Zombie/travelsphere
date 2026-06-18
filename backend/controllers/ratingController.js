const Rating = require("../models/Rating");
const Destination = require("../models/Destination");

// POST /api/ratings/:destinationId
// Create or update a rating — returns updated avgRating & totalRatings
const rateDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;
        const { value } = req.body; // frontend sends { value }

        if (!value || value < 1 || value > 5) {
            return res.status(400).json({ message: "Rating value must be between 1 and 5" });
        }

        const existing = await Rating.findOne({
            user: req.user._id,
            destination: destinationId,
        });

        if (existing) {
            existing.rating = value;
            await existing.save(); // triggers post-save hook → updates destination
        } else {
            await Rating.create({
                user: req.user._id,
                destination: destinationId,
                rating: value,
            });
        }

        // Fetch updated destination stats to return to frontend
        const updated = await Destination.findById(destinationId).select("avgRating totalRatings");

        res.json({
            avgRating: updated.avgRating,
            totalRatings: updated.totalRatings,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/ratings/:destinationId/mine
// Get the logged-in user's own rating for a destination
const getMyRating = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const rating = await Rating.findOne({
            user: req.user._id,
            destination: destinationId,
        });

        if (!rating) return res.json({ value: null });

        res.json({ value: rating.rating });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/ratings/:destinationId
const deleteRating = async (req, res) => {
    try {
        const doc = await Rating.findOneAndDelete({
            user: req.user._id,
            destination: req.params.destinationId,
        });

        if (!doc) return res.status(404).json({ message: "Rating not found" });

        const updated = await Destination.findById(req.params.destinationId).select("avgRating totalRatings");

        res.json({
            message: "Rating removed",
            avgRating: updated.avgRating,
            totalRatings: updated.totalRatings,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/ratings/:destinationId — all ratings for a destination
const getDestinationRatings = async (req, res) => {
    try {
        const ratings = await Rating.find({ destination: req.params.destinationId })
            .populate("user", "name avatar");

        res.json({ ratings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { rateDestination, getMyRating, deleteRating, getDestinationRatings };