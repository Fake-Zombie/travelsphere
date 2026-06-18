const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
    rateDestination,
    getMyRating,
    deleteRating,
    getDestinationRatings,
} = require("../controllers/ratingController");

router.post("/:destinationId", protect, rateDestination);         // POST   /api/ratings/:destId
router.get("/:destinationId/mine", protect, getMyRating);         // GET    /api/ratings/:destId/mine
router.delete("/:destinationId", protect, deleteRating);          // DELETE /api/ratings/:destId
router.get("/:destinationId", protect, getDestinationRatings);    // GET    /api/ratings/:destId

module.exports = router;