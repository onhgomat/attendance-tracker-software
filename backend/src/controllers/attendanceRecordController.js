
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const logActivity = require("../services/activityLogger");

// ==========================================
// CREATE PERMANENT ATTENDANCE RECORD
// ==========================================

const createAttendanceRecord = async (req, res) => {
  try {
    const {
      enrollmentNumber,
      status,
      faceMatchScore,
      verificationMethod,
      reviewedBy,
    } = req.body || {};

    // Validate enrollment number
    if (
      typeof enrollmentNumber !== "string" ||
      enrollmentNumber.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Enrollment number is required",
      });
    }

    // Validate attendance status
    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          'Status must be either "present" or "absent"',
      });
    }

    // Validate verification method
    if (
      !["face", "admin_review"].includes(
        verificationMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Verification method must be either "face" or "admin_review"',
      });
    }

    // Validate face match score
    if (
      faceMatchScore !== undefined &&
      faceMatchScore !== null &&
      (
        typeof faceMatchScore !== "number" ||
        !Number.isFinite(faceMatchScore) ||
        faceMatchScore < 0 ||
        faceMatchScore > 100
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Face match score must be between 0 and 100",
      });
    }

    const normalizedEnrollment =
      enrollmentNumber.trim().toUpperCase();

    // Find student in MongoDB
    const student = await Student.findOne({
      enrollmentNumber: normalizedEnrollment,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Face verification score validation
    if (
      verificationMethod === "face" &&
      (
        faceMatchScore === undefined ||
        faceMatchScore === null
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Face match score is required for face verification",
      });
    }

    // Admin review validation
    if (
      verificationMethod === "admin_review" &&
      !reviewedBy
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reviewer information is required for admin review",
      });
    }

    const now = new Date();

    const attendanceDay = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    // Check duplicate attendance
    const existingAttendance =
      await Attendance.findOne({
        student: student._id,
        attendanceDay,
      });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student today",
        data: {
          attendanceId:
            existingAttendance._id,
          status:
            existingAttendance.status,
        },
      });
    }

    // Create attendance record in MongoDB
    const attendance =
      await Attendance.create({
        student: student._id,
        enrollmentNumber:
          student.enrollmentNumber,
        studentName:
          student.name,
        attendanceDate: now,
        attendanceDay,
        status,
        faceMatchScore:
          faceMatchScore ?? null,
        verificationMethod,
        reviewedBy:
          reviewedBy ?? null,
        reviewedAt:
          reviewedBy ? now : null,
      });

    // Log activity in MySQL
    await logActivity({
      req,
      adminId: req.admin?.adminId,
      action: "ATTENDANCE_RECORD_CREATED",
      entityType: "Attendance",
      entityId: attendance._id,
      details: {
        studentName: attendance.studentName,
        enrollmentNumber:
          attendance.enrollmentNumber,
        status: attendance.status,
        verificationMethod:
          attendance.verificationMethod,
      },
    });

    // Success response
    return res.status(201).json({
      success: true,
      message:
        "Attendance record created successfully",
      data: {
        id: attendance._id,
        studentName:
          attendance.studentName,
        enrollmentNumber:
          attendance.enrollmentNumber,
        attendanceDate:
          attendance.attendanceDate,
        attendanceDay:
          attendance.attendanceDay,
        status:
          attendance.status,
        faceMatchScore:
          attendance.faceMatchScore,
        verificationMethod:
          attendance.verificationMethod,
        reviewedBy:
          attendance.reviewedBy,
        reviewedAt:
          attendance.reviewedAt,
        createdAt:
          attendance.createdAt,
      },
    });

  } catch (error) {
    console.error(
      "Create attendance record error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student today",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==========================================
// GET STUDENT ATTENDANCE HISTORY
// ==========================================

const getStudentAttendance = async (
  req,
  res
) => {
  try {
    const { enrollmentNumber } = req.params;

    if (
      typeof enrollmentNumber !== "string" ||
      enrollmentNumber.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enrollment number is required",
      });
    }

    const normalizedEnrollment =
      enrollmentNumber.trim().toUpperCase();

    const student = await Student.findOne({
      enrollmentNumber: normalizedEnrollment,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const attendance =
      await Attendance.find({
        student: student._id,
      })
        .sort({
          attendanceDate: -1,
        })
        .select(
          "attendanceDate attendanceDay status faceMatchScore verificationMethod reviewedBy reviewedAt createdAt"
        );

    return res.status(200).json({
      success: true,
      student: {
        name: student.name,
        enrollmentNumber:
          student.enrollmentNumber,
      },
      count: attendance.length,
      data: attendance,
    });

  } catch (error) {
    console.error(
      "Get student attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==========================================
// GET ALL ATTENDANCE RECORDS
// ==========================================

const getAllAttendance = async (
  req,
  res
) => {
  try {
    const attendance =
      await Attendance.find()
        .sort({
          attendanceDate: -1,
        })
        .populate(
          "student",
          "name enrollmentNumber"
        )
        .populate(
          "reviewedBy",
          "name email"
        );

    return res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });

  } catch (error) {
    console.error(
      "Get all attendance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createAttendanceRecord,
  getStudentAttendance,
  getAllAttendance,
};
