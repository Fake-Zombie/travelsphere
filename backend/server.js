const dotenv = require("dotenv");
dotenv.config();


const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const destinationRoutes = require("./routes/destinationRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const adminRoutes = require("./routes/adminRoutes");
const guideRoutes = require("./routes/guideRoutes");
const requestRoutes = require("./routes/requestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const companionRoutes = require("./routes/companionRoutes");
const postRoutes = require("./routes/postRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const bookingRoutes = require('./routes/bookingRoutes');
const bookingChatRoutes = require("./routes/bookingChatRoutes");
const guideStatsRoutes = require('./routes/guideStatsRoutes');
const adminPaymentRoutes = require('./routes/adminPaymentRoutes');
const guidePaymentRoutes = require('./routes/guidePaymentRoutes');


connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible in routes via req.app.get("io")
app.set("io", io);

app.use(cors());
app.use(express.json());
app.use("/static", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminPaymentRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/guides", guidePaymentRoutes);
app.use("/api/destinations", destinationRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/companions", companionRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/conversations", conversationRoutes);
app.use('/api/booking', bookingRoutes);
app.use("/api/booking-chat", bookingChatRoutes);




app.get("/", (req, res) => {
  res.send("TravelSphere API Running...");
});

// Socket.io logic
require("./socket")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.message);
  res.status(500).json({ message: err.message || "Internal server error" });
});