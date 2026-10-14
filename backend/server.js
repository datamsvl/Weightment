const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const weighmentRoutes = require("./routes/weighmentRoutes");

dotenv.config();

const app = express();

// Allow your Netlify frontend and local development frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-side tools
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

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