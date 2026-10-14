const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const weighmentRoutes = require("./routes/weighmentRoutes");

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://comfy-pasca-dc6387.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Your routes
app.use("/api/weighments", weighmentRoutes);

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running successfully",
  });
});

// Check MongoDB connection
app.get("/api/db-status", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    connected,
    message: connected
      ? "MongoDB Atlas connected successfully"
      : "MongoDB Atlas is not connected",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Atlas Connected Successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();