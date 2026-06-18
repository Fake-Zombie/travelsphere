const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

const populateReviews = (query) =>
    query
        .populate("user", "username profile_pic")
        .populate("replies.user", "username profile_pic");

// GET /api/reviews/:destinationId
router.get("/:destinationId", async (req, res) => {
    try {
        const reviews = await populateReviews(
            Review.find({ destination: req.params.destinationId }).sort({ createdAt: -1 })
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/reviews/:destinationId
router.post("/:destinationId", protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: "Review text is required" });
        const review = await Review.create({ user: req.user._id, destination: req.params.destinationId, text });

        // Mention notifications
        const mentionRegex = /@(\w+)/g;
        const mentionedUsernames = [...text.matchAll(mentionRegex)].map(m => m[1]);
        if (mentionedUsernames.length > 0) {
            const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } }).select('_id username');
            for (const mentioned of mentionedUsers) {
                if (mentioned._id.toString() === req.user._id.toString()) continue;
                const newNotif = await Notification.create({
                    recipient: mentioned._id,
                    sender: req.user._id,
                    message: `mentioned you in a review`,
                    type: 'mention',
                    link: `/destination/${req.params.destinationId}`,
                    relatedReview: review._id,
                });
                const io = req.app.get("io");
                const populated = await newNotif.populate("sender", "username profile_pic");
                io.sendNotification(mentioned._id.toString(), populated);
            }
        }

        const populated = await populateReviews(Review.findById(review._id));
        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/reviews/:reviewId/like
router.post("/:reviewId/like", protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });

        const userId = req.user._id.toString();
        const alreadyLiked = review.likes.map(id => id.toString()).includes(userId);

        if (alreadyLiked) {
            review.likes = review.likes.filter(id => id.toString() !== userId);
            await Notification.deleteOne({
                relatedReview: review._id,
                sender: req.user._id,
                type: "review",
                message: { $regex: "liked your review" }
            });
        } else {
            review.likes.push(req.user._id);
            if (review.user.toString() !== userId) {
                const preview = review.text.length > 40 ? review.text.substring(0, 40) + '...' : review.text;
                const newNotif = await Notification.create({
                    recipient: review.user,
                    sender: req.user._id,
                    message: `liked your review "${preview}"`,
                    type: "review",
                    link: `/destination/${review.destination}`,
                    relatedReview: review._id,
                });
                const io = req.app.get("io");
                const populated = await newNotif.populate("sender", "username profile_pic");
                io.sendNotification(review.user.toString(), populated);
            }
        }

        await review.save();
        res.json({ likes: review.likes });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/reviews/:reviewId/reply
router.post("/:reviewId/reply", protect, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ message: "Reply text is required" });

        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });

        review.replies.push({ user: req.user._id, text });
        await review.save();

        if (review.user.toString() !== req.user._id.toString()) {
    const replyPreview = text.length > 40 ? text.substring(0, 40) + '...' : text;
    const reviewPreview = review.text.length > 40 ? review.text.substring(0, 40) + '...' : review.text;
    const newNotif = await Notification.create({
        recipient: review.user,
        sender: req.user._id,
        message: `replied "${replyPreview}" to your review "${reviewPreview}"`,
        type: "review",
        link: `/destination/${review.destination}`,
        relatedReview: review._id,
    });
    const io = req.app.get("io");
    const populated = await newNotif.populate("sender", "username profile_pic");
    io.sendNotification(review.user.toString(), populated);
}

// Mention notifications
const mentionRegex = /@(\w+)/g;
const mentionedUsernames = [...text.matchAll(mentionRegex)].map(m => m[1]);

if (mentionedUsernames.length > 0) {
    const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } }).select('_id username');
    for (const mentioned of mentionedUsers) {
        // skip if they're the sender or already got a reply notification
        if (mentioned._id.toString() === req.user._id.toString()) continue;
        if (mentioned._id.toString() === review.user.toString()) continue;
        const newNotif=await Notification.create({
            recipient: mentioned._id,
            sender: req.user._id,
            message: `mentioned you in a reply`,
            type: 'mention',
            link: `/destination/${review.destination}`,
            relatedReview: review._id,
        });
        const io = req.app.get("io");
const populated = await newNotif.populate("sender", "username profile_pic");
io.sendNotification(recipientId.toString(), populated);
    }
}

// Notify other reply authors in the thread
const replyAuthorIds = [...new Set(
    review.replies
        .map(r => r.user.toString())
        .filter(id => 
            id !== req.user._id.toString() && 
            id !== review.user.toString()
        )
)];

for (const authorId of replyAuthorIds) {
    const newNotif=await Notification.create({
        recipient: authorId,
        sender: req.user._id,
        message: `replied to a thread you're in`,
        type: 'review',
        link: `/destination/${review.destination}`,
        relatedReview: review._id,
    });
    const io = req.app.get("io");
const populated = await newNotif.populate("sender", "username profile_pic");
io.sendNotification(recipientId.toString(), populated);
}

        const populated = await populateReviews(Review.findById(review._id));
        res.json({ replies: populated.replies });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/reviews/:reviewId/replies/:replyId/like
router.post("/:reviewId/replies/:replyId/like", protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });

        const reply = review.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ message: "Reply not found" });

        const userId = req.user._id.toString();
        const alreadyLiked = reply.likes.map(id => id.toString()).includes(userId);

        if (alreadyLiked) {
            reply.likes = reply.likes.filter(id => id.toString() !== userId);
            await Notification.deleteOne({
                relatedReview: review._id,
                sender: req.user._id,
                type: "review",
                message: { $regex: "liked your reply" }
            });
        } else {
            reply.likes.push(req.user._id);
            if (reply.user.toString() !== userId) {
                const preview = reply.text.length > 40 ? reply.text.substring(0, 40) + '...' : reply.text;
                const newNotif = await Notification.create({
                    recipient: reply.user,
                    sender: req.user._id,
                    message: `liked your reply "${preview}"`,
                    type: "review",
                    link: `/destination/${review.destination}`,
                    relatedReview: review._id,
                });
                const io = req.app.get("io");
                const populated = await newNotif.populate("sender", "username profile_pic");
                io.sendNotification(reply.user.toString(), populated);
            }
        }

        await review.save();
        const populated = await populateReviews(Review.findById(review._id));
        res.json({ replies: populated.replies });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// DELETE the full review
router.delete("/:reviewId", protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });
        const isOwner = review.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin";
        if (!isOwner && !isAdmin) return res.status(403).json({ message: "Not authorized" });

        await Notification.deleteMany({ relatedReview: review._id });

        await review.deleteOne();
        res.json({ message: "Review deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// DELETE replies
router.delete("/:reviewId/replies/:replyId", protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);
        if (!review) return res.status(404).json({ message: "Review not found" });
        const reply = review.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ message: "Reply not found" });
        const isOwner = reply.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === "admin";
        if (!isOwner && !isAdmin) return res.status(403).json({ message: "Not authorized" });

        const replyAuthorId = reply.user;

        reply.deleteOne();
        await review.save();

        await Notification.deleteOne({
            relatedReview: review._id,
            sender: replyAuthorId,
            type: "review",
            message: { $regex: "replied to your review" }
        });

        res.json({ message: "Reply deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



module.exports = router;