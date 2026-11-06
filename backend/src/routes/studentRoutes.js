const express = require("express");

const {
registerStudent,
registerFace,
} = require("../controllers/studentController");

const protectAdmin = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================================
// STUDENT REGISTRATION
// ADMIN ONLY
// ============================================================

router.post(
"/register",
protectAdmin,
registerStudent
);

// ============================================================
// FACE REGISTRATION
// ADMIN ONLY
// ============================================================

router.post(
"/register-face",
protectAdmin,
registerFace
);

module.exports = router;