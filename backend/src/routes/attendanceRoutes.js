const express = require("express");

const {
createAttendanceRequest,
verifyAttendanceFace,
getPendingAttendanceRequests,
reviewAttendanceRequest,
} = require("../controllers/attendanceController");

const {
createAttendanceRecord,
getStudentAttendance,
getAllAttendance,
} = require("../controllers/attendanceRecordController");

const protectAdmin = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// STUDENT - FACE VERIFICATION + ATTENDANCE
// ==========================================

router.post(
"/verify",
verifyAttendanceFace
);

// ==========================================
// STUDENT - CREATE ATTENDANCE REQUEST
// ==========================================

router.post(
"/request",
createAttendanceRequest
);

// ==========================================
// ADMIN - GET PENDING REQUESTS
// ==========================================

router.get(
"/pending",
protectAdmin,
getPendingAttendanceRequests
);

// ==========================================
// ADMIN - REVIEW ATTENDANCE REQUEST
// ==========================================

router.patch(
"/:id/review",
protectAdmin,
reviewAttendanceRequest
);

// ==========================================
// CREATE PERMANENT ATTENDANCE RECORD
// ==========================================

router.post(
"/record",
protectAdmin,
createAttendanceRecord
);

// ==========================================
// GET STUDENT ATTENDANCE HISTORY
// ==========================================

router.get(
"/student/:enrollmentNumber",
protectAdmin,
getStudentAttendance
);

// ==========================================
// GET ALL ATTENDANCE RECORDS
// ==========================================

router.get(
"/records",
protectAdmin,
getAllAttendance
);

module.exports = router;