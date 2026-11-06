
require("./dns");
require("dotenv").config({ path: "./.env" });

console.log(
  "JWT_SECRET loaded:",
  process.env.JWT_SECRET ? "YES" : "NO"
);

console.log(
  "JWT_EXPIRES_IN:",
  process.env.JWT_EXPIRES_IN || "NOT SET"
);

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const { connectMySQL } = require("./config/mysql");

const AdminActivityLog = require("./models/AdminActivityLog");

const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Existing MongoDB-powered routes
app.use("/api/students", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attendance", attendanceRoutes);

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance Tracker Backend is running",
    databases: {
      mongodb: "Connected",
      mysql: "Connected"
    }
  });
});

// Connect both databases and initialize MySQL table
const startServer = async () => {
  try {
    await connectDB();
    await connectMySQL();

    await AdminActivityLog.sync();

    console.log("MySQL admin_activity_logs table ready!");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
