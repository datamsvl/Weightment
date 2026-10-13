
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const weighmentRoutes = require("./routes/weighmentRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/weighments", weighmentRoutes);

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running successfully"
  });
});

// Check MongoDB connection
app.get("/api/db-status", (req, res) => {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    connected,
    message: connected
      ? "MongoDB Atlas connected successfully"
      : "MongoDB Atlas is not connected"
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Atlas Connected Successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();
