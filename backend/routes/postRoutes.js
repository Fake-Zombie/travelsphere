const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Companion = require("../models/Companion");
const { protect: auth } = require("../middleware/authMiddleware");
const upload = require("../middleware/postUploadMiddleware");
const Notification = require("../models/Notification");

// Create post
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const { text, destinationTag } = req.body;
    if (!text && !req.file)
      return res.status(400).json({ message: "Post must have text or image" });

    const hashtags = req.body.hashtags ? JSON.parse(req.body.hashtags) : [];
    const post = await Post.create({
      author: req.user.id,
      text: text || "",
      image: req.file ? req.file.path : "",
      destinationTag: destinationTag || null,
      hashtags, 
    });

    await post.populate("author", "username profile_pic role");
    if (post.destinationTag) await post.populate("destinationTag", "name");

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Trending — sorted by likes count
router.get("/trending", auth, async (req, res) => {
  try {
    const posts = await Post.aggregate([
      { $addFields: { likesCount: { $size: "$likes" } } },
      { $sort: { likesCount: -1, createdAt: -1 } },
      { $limit: 50 },
    ]);

    // populate after aggregate
    await Post.populate(posts, [
      { path: "author", select: "username profile_pic role" },
      { path: "destinationTag", select: "name" },
        { path: "comments.user", select: "username profile_pic" },  
    ]);

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Global — all posts newest first
router.get("/global", auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("author", "username profile_pic role")
      .populate("destinationTag", "name")
      .populate("comments.user", "username profile_pic");

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get feed (own posts + companions' posts + guides' posts)
router.get("/feed", auth, async (req, res) => {
  try {
    // Get accepted companion IDs
    const companions = await Companion.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: "accepted",
    });

    const companionIds = companions.map((c) =>
      c.sender.toString() === req.user.id ? c.receiver : c.sender
    );

    // Get guide user IDs
    const UserModel = require("../models/User");
    const guides = await UserModel.find({ role: "guide" }, "_id");
    const guideIds = guides.map((g) => g._id);

    const authorIds = [...new Set([
      req.user.id,
      ...companionIds.map(String),
      ...guideIds.map(String),
    ])];

    const posts = await Post.find({ author: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .populate("author", "username profile_pic role")
      .populate("destinationTag", "name")
      .populate("comments.user", "username profile_pic");

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get posts by a specific user (for profile page)
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("author", "username profile_pic role")
      .populate("destinationTag", "name")
      .populate("comments.user", "username profile_pic");

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADD THIS ENDPOINT to post.js - Place it AFTER the /user/:userId route and BEFORE the /:id/like route

// Get posts tagged with a specific destination
router.get("/destination/:destinationId", auth, async (req, res) => {
  try {
    const posts = await Post.find({ 
      destinationTag: req.params.destinationId, 
      image: { $exists: true, $ne: "" } 
    })
      .sort({ createdAt: -1 })
      .populate("author", "username profile_pic role")
      .populate("destinationTag", "name")
      .populate("comments.user", "username profile_pic");

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like / unlike toggle
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const liked = post.likes.includes(req.user.id);
    if (liked) {
      post.likes.pull(req.user.id);
    } else {
      post.likes.push(req.user.id);
    }
    await post.save();
    if (!liked) {
const newNotif = await Notification.create({
    recipient:   post.author,
    sender:      req.user.id,
    type:        "post_like",
    message:     "liked your post.",
    link:        "/social",
    relatedPost: post._id,
  });
  const io = req.app.get("io");
  const populated = await newNotif.populate("sender", "username profile_pic");
  io.sendNotification(post.author.toString(), populated);
}
    res.json({ likes: post.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ user: req.user.id, text });
    await post.save();
    if (post.author.toString() !== req.user.id) {
const newNotif = await Notification.create({
    recipient:   post.author,
    sender:      req.user.id,
    type:        "post_comment",
    message:     "commented on your post.",
    link:        "/social",
    relatedPost: post._id,
  });
  const io = req.app.get("io");
  const populated = await newNotif.populate("sender", "username profile_pic");
  io.sendNotification(post.author.toString(), populated);
}
    await post.populate("comments.user", "username profile_pic");

    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete post (owner or admin)


router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isOwner = post.author.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

   // delete image from Cloudinary
if (post.image) {
  try {
    const cloudinary = require("../config/cloudinary");
    // Extract full public_id including folder: "travelsphere/post_images/filename"
    const urlParts = post.image.split("/");
    const filenameWithExt = urlParts[urlParts.length - 1];
    const filename = filenameWithExt.split(".")[0];
    const folder = urlParts[urlParts.length - 2];
    const publicId = `${folder}/${filename}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (cloudErr) {
    console.warn("Cloudinary delete failed:", cloudErr.message);
    // Don't crash — still delete the post from DB
  }
}

    await post.deleteOne();

    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Delete comment (comment owner or post owner or admin)
router.delete("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isCommentOwner = comment.user.toString() === req.user.id;
    const isPostOwner    = post.author.toString() === req.user.id;
    const isAdmin        = req.user.role === "admin";

    if (!isCommentOwner && !isPostOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    comment.deleteOne();
    await post.save();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like / unlike a comment
router.post("/:id/comment/:commentId/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const alreadyLiked = comment.likes.includes(req.user.id);
    if (alreadyLiked) {
      comment.likes.pull(req.user.id);
    } else {
      comment.likes.push(req.user.id);
    }
    await post.save();

    // Notify comment author when liked (not self-like)
    if (!alreadyLiked && comment.user.toString() !== req.user.id) {
      const newNotif=await Notification.create({
        recipient:   comment.user,
        sender:      req.user.id,
        type:        "post_like",
        message:     "liked your comment.",
        link:        "/social",
        relatedPost: post._id,
      });
      const io = req.app.get("io");
const populated = await newNotif.populate("sender", "username profile_pic");
io.sendNotification(recipientId.toString(), populated);
    }

    res.json({ liked: !alreadyLiked, likesCount: comment.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;