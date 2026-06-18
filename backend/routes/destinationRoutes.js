const express = require("express");
const router = express.Router();
const Destination = require("../models/Destination");
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/destinations/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Get all destinations
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? { name: { $regex: search, $options: "i" } }
      : {};
    const destinations = await Destination.find(query);
    res.json(destinations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single destination — fresh avgRating & totalRatings
router.get("/:id", async (req, res) => {
  try {
    const dest = await Destination.findById(req.params.id);
    if (!dest) return res.status(404).json({ message: "Destination not found" });
    res.json(dest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

 
// Add destination
router.post("/", protect, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const { name, country, description, type, bestTimeMonths, bestTimeReason } = req.body;
    const image = `/static/destinations/${req.file.filename}`;
    const dest = await Destination.create({
      name, country, description, type, image,
      bestTimeToVisit: {
        months: bestTimeMonths || "",
        reason: bestTimeReason || "",
      }
    });
    res.status(201).json(dest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Edit destination
router.put("/:id", protect, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const { name, country, description, type, bestTimeMonths, bestTimeReason } = req.body;
    const updates = {
      name, country, description, type,
      bestTimeToVisit: {
        months: bestTimeMonths || "",
        reason: bestTimeReason || "",
      }
    };
    if (req.file) updates.image = `/static/destinations/${req.file.filename}`;
    const dest = await Destination.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(dest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Delete destination
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Destination.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;