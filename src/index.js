import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import jobRoutes from "./routes/jobs.js";
import postRoutes from "./routes/posts.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/posts", postRoutes);

app.use(errorHandler);

// Health check for Render and uptime probes
app.get("/", (req, res) => res.send("OK"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 8181;
const server = app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown: close HTTP server and MongoDB connection
const gracefulShutdown = () => {
  console.log("Received shutdown signal, closing server...");
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed. Exiting process.");
      process.exit(0);
    });
  });
  // Force exit after 10s
  setTimeout(() => {
    console.error("Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
