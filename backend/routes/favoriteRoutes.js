const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Destination = require("../models/Destination");


// GET FAVORITES
router.get("/", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("favorites");

    res.json(user.favorites);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ADD TO FAVORITES
router.post("/:destinationId", protect, async (req, res) => {
  try {
    const { destinationId } = req.params;

    const user = await User.findById(req.user.id);
    const destination = await Destination.findById(destinationId);

    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    if (user.favorites.includes(destinationId)) {
      return res.status(400).json({ message: "Already in favorites" });
    }

    user.favorites.push(destinationId);
    await user.save();

    await Destination.findByIdAndUpdate(destinationId, {
      $inc: { favoritesCount: 1 },
    });

    res.json({ message: "Added to favorites" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// REMOVE FROM FAVORITES
router.delete("/:destinationId", protect, async (req, res) => {
  try {
    const { destinationId } = req.params;

    const user = await User.findById(req.user.id);
    const destination = await Destination.findById(destinationId);

    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    user.favorites = user.favorites.filter(
      (fav) => fav.toString() !== destinationId
    );

    await user.save();

    await Destination.findByIdAndUpdate(destinationId, {
      $inc: { favoritesCount: -1 },
    });

    res.json({ message: "Removed from favorites" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;