const express = require("express");
const router = express.Router();
const User = require("../models/User");
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  uploadProfilePic,
  getPublicProfile,
  searchUsers,
  getUserByUsername
} = require("../controllers/authController");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const googleClient = new OAuth2Client("841134550939-omf7ttvgovkqo61utg9mgmjs3glvr9fo.apps.googleusercontent.com");


router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/upload-profile-pic", protect, upload.single("profile_pic"), uploadProfilePic);
router.get("/user/username/:username", getUserByUsername);
router.get("/user/:id", getPublicProfile); 
router.get("/search", searchUsers); 

router.patch("/update-bio", protect, async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bio },
      { new: true }
    );
    res.json({ success: true, bio: user.bio });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: "841134550939-omf7ttvgovkqo61utg9mgmjs3glvr9fo.apps.googleusercontent.com",
    });

    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36) + Date.now().toString(),
        10
      );
      user = await User.create({
        username: name.replace(/\s+/g, "").toLowerCase() + Math.floor(Math.random() * 1000),
        email,
        password: randomPassword,
        country: "",
        profile_pic: picture || "",
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      _id: user._id,
      username: user.username,
      email: user.email,
      country: user.country,
      profile_pic: user.profile_pic,
      role: user.role,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ message: "Google authentication failed" });
  }
});
module.exports = router;