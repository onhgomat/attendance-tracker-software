
const express = require("express");

const {
  registerAdmin,
  loginAdmin,
} = require("../controllers/adminController");

const {
  getAdminActivityLogs,
} = require("../controllers/adminActivityController");

const protectAdmin = require("../middleware/authMiddleware");

const router = express.Router();

// PUBLIC ADMIN ROUTES
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// PROTECTED ADMIN ROUTES
router.get(
  "/activity-logs",
  protectAdmin,
  getAdminActivityLogs
);

router.get("/profile", protectAdmin, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Admin authentication successful",
    admin: req.admin,
  });
});

module.exports = router;
