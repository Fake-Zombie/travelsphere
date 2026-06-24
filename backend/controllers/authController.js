const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Helper function to generate token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// SIGNUP
exports.registerUser = async (req, res) => {
  try {
    const { username, email, country, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      country,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      country: user.country,
      role: user.role,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        token: generateToken(user),
        _id: user._id,
        username: user.username,
        email: user.email,
        country: user.country,
        profile_pic: user.profile_pic,
        role: user.role,
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PROFILE PIC UPLOAD
exports.uploadProfilePic = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profile_pic = req.file.path;
    await user.save();

    res.json({
      success: true,
      profile_pic: user.profile_pic,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET PUBLIC PROFILE
exports.getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("username email country profile_pic role createdAt");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// SEARCH USERS BY USERNAME
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const users = await User.find({
      username: { $regex: `^${q}`, $options: "i" },
    })
      .select("_id username profile_pic")
      .limit(6);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//mentioned username get
exports.getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("_id username email country profile_pic role createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};