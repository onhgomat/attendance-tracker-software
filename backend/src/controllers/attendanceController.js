
const Student = require("../models/Student");
const AttendanceRequest = require("../models/AttendanceRequest");
const Attendance = require("../models/Attendance");
const mongoose = require("mongoose");

const { verifyFace } = require("../services/faceService");
const logActivity = require("../services/activityLogger");

// ==========================================
// GET ATTENDANCE DAY
// ==========================================

const getAttendanceDay = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

// ==========================================
// CREATE ATTENDANCE REQUEST
// ==========================================

const createAttendanceRequest = async (req, res) => {
  try {
    const {
      enrollmentNumber,
      faceMatchScore,
      attendanceFaceImage,
    } = req.body || {};

    if (
      typeof enrollmentNumber !== "string" ||
      enrollmentNumber.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Enrollment number is required",
      });
    }

    if (
      typeof faceMatchScore !== "number" ||
      !Number.isFinite(faceMatchScore)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid face match score is required",
      });
    }

    if (faceMatchScore < 0 || faceMatchScore > 100) {
      return res.status(400).json({
        success: false,
        message: "Face match score must be between 0 and 100",
      });
    }

    if (
      attendanceFaceImage !== undefined &&
      attendanceFaceImage !== null &&
      (
        typeof attendanceFaceImage !== "string" ||
        attendanceFaceImage.trim() === ""
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance face image",
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

    if (faceMatchScore > 60) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance request is only required when score is 60 or below",
      });
    }

    const attendanceDay = getAttendanceDay();

    const existingAttendance = await Attendance.findOne({
      student: student._id,
      attendanceDay,
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student today",
        data: {
          attendanceId: existingAttendance._id,
          status: existingAttendance.status,
        },
      });
    }

    const existingRequest = await AttendanceRequest.findOne({
      student: student._id,
      attendanceDay,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message:
          "A pending attendance request already exists for this student today",
        data: {
          requestId: existingRequest._id,
        },
      });
    }

    const attendanceRequest = await AttendanceRequest.create({
      student: student._id,
      enrollmentNumber: student.enrollmentNumber,
      studentName: student.name,
      attendanceDay,
      faceMatchScore,
      attendanceFaceImage:
        attendanceFaceImage || null,
      status: "pending",
    });

    // Log request creation in MySQL
    await logActivity({
      req,
      action: "ATTENDANCE_REQUEST_CREATED",
      entityType: "AttendanceRequest",
      entityId: attendanceRequest._id,
      details: {
        studentName: student.name,
        enrollmentNumber: student.enrollmentNumber,
        faceMatchScore,
        status: "pending",
      },
    });

    return res.status(201).json({
      success: true,
      message:
        "Attendance request created. Admin review required.",
      data: {
        requestId: attendanceRequest._id,
        studentName: attendanceRequest.studentName,
        enrollmentNumber:
          attendanceRequest.enrollmentNumber,
        attendanceDay:
          attendanceRequest.attendanceDay,
        faceMatchScore:
          attendanceRequest.faceMatchScore,
        attendanceFaceImage:
          attendanceRequest.attendanceFaceImage,
        status: attendanceRequest.status,
        createdAt: attendanceRequest.createdAt,
      },
    });

  } catch (error) {
    console.error(
      "Create attendance request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==========================================
// VERIFY ATTENDANCE FACE
// ==========================================

const verifyAttendanceFace = async (req, res) => {
  try {
    const {
      enrollmentNumber,
      image,
    } = req.body || {};

    if (
      typeof enrollmentNumber !== "string" ||
      enrollmentNumber.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Enrollment number is required",
      });
    }

    if (
      typeof image !== "string" ||
      image.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Face image is required",
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

    if (
      !student.faceRegistered ||
      !Array.isArray(student.faceData) ||
      student.faceData.length !== 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Face is not registered for this student",
      });
    }

    const attendanceDay = getAttendanceDay();

    const existingAttendance = await Attendance.findOne({
      student: student._id,
      attendanceDay,
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student today",
        data: {
          attendanceId: existingAttendance._id,
          status: existingAttendance.status,
        },
      });
    }

    console.log(
      "Starting face verification for:",
      student.enrollmentNumber
    );

    const verificationResult = await verifyFace(
      image,
      student.faceData
    );

    if (
      !verificationResult ||
      verificationResult.success !== true
    ) {
      return res.status(502).json({
        success: false,
        message:
          "Face verification service returned an invalid response",
      });
    }

    if (verificationResult.faceCount !== 1) {
      return res.status(400).json({
        success: false,
        message:
          verificationResult.message ||
          "Exactly one face must be detected",
        data: {
          reason:
            verificationResult.reason || null,
          faceCount:
            verificationResult.faceCount || 0,
        },
      });
    }

    if (
      verificationResult.reason ===
      "QUALITY_CHECK_FAILED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          verificationResult.message ||
          "Face quality check failed",
        data: {
          reason: verificationResult.reason,
          quality:
            verificationResult.quality || null,
          detectionScore:
            verificationResult.detectionScore || null,
        },
      });
    }

    const similarity = Number(
      verificationResult.similarity
    );

    if (!Number.isFinite(similarity)) {
      return res.status(502).json({
        success: false,
        message:
          "Face verification service did not return a valid similarity score",
      });
    }

    console.log(
      "Face similarity:",
      similarity
    );

    /*
     * Temporary SFace similarity threshold.
     * Calibrate later using genuine and impostor samples.
     */
    const FACE_MATCH_THRESHOLD = 0.60;

    const matchAccepted =
      similarity >= FACE_MATCH_THRESHOLD;

    const faceMatchScore = Number(
      (similarity * 100).toFixed(2)
    );

    // ==========================================
    // AUTOMATIC ATTENDANCE APPROVAL
    // ==========================================

    if (matchAccepted) {
      const now = new Date();

      try {
        const attendance = await Attendance.create({
          student: student._id,
          enrollmentNumber:
            student.enrollmentNumber,
          studentName: student.name,
          attendanceDate: now,
          attendanceDay,
          status: "present",
          faceMatchScore: faceMatchScore,
          verificationMethod: "face",
          reviewedBy: null,
          reviewedAt: null,
        });

        // Log automatic approval in MySQL
        await logActivity({
          req,
          action: "ATTENDANCE_AUTO_APPROVED",
          entityType: "Attendance",
          entityId: attendance._id,
          details: {
            studentName: student.name,
            enrollmentNumber:
              student.enrollmentNumber,
            faceMatchScore,
            status: "present",
            verificationMethod: "face",
          },
        });

        console.log(
          "Attendance automatically marked present:",
          student.enrollmentNumber
        );

        return res.status(201).json({
          success: true,
          message: "Attendance marked present",
          data: {
            attendanceId: attendance._id,
            studentName: student.name,
            enrollmentNumber:
              student.enrollmentNumber,
            attendanceDay,
            status: attendance.status,
            verificationMethod:
              attendance.verificationMethod,
            similarity: Number(
              similarity.toFixed(6)
            ),
            faceMatchScore:
              attendance.faceMatchScore,
            detectionScore:
              verificationResult.detectionScore,
            quality:
              verificationResult.quality,
            processingTimeSeconds:
              verificationResult.processingTimeSeconds,
          },
        });

      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message:
              "Attendance has already been recorded for this student today",
          });
        }

        throw error;
      }
    }

    // ==========================================
    // SEND FOR ADMIN REVIEW
    // ==========================================

    const existingRequest =
      await AttendanceRequest.findOne({
        student: student._id,
        attendanceDay,
        status: "pending",
      });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message:
          "A pending attendance request already exists for this student today",
        data: {
          requestId: existingRequest._id,
        },
      });
    }

    const attendanceRequest =
      await AttendanceRequest.create({
        student: student._id,
        enrollmentNumber:
          student.enrollmentNumber,
        studentName:
          student.name,
        attendanceDay,
        faceMatchScore:
          faceMatchScore,
        attendanceFaceImage:
          image,
        status: "pending",
      });

    // Log request creation in MySQL
    await logActivity({
      req,
      action: "ATTENDANCE_REQUEST_CREATED",
      entityType: "AttendanceRequest",
      entityId: attendanceRequest._id,
      details: {
        studentName: student.name,
        enrollmentNumber:
          student.enrollmentNumber,
        faceMatchScore,
        status: "pending",
        source: "face_verification",
      },
    });

    console.log(
      "Attendance sent for admin review:",
      student.enrollmentNumber
    );

    return res.status(201).json({
      success: true,
      message:
        "Face verification completed. Admin review required.",
      data: {
        requestId:
          attendanceRequest._id,
        studentName:
          student.name,
        enrollmentNumber:
          student.enrollmentNumber,
        attendanceDay:
          attendanceDay,
        status:
          attendanceRequest.status,
        similarity:
          Number(
            similarity.toFixed(6)
          ),
        faceMatchScore:
          attendanceRequest.faceMatchScore,
        detectionScore:
          verificationResult.detectionScore,
        quality:
          verificationResult.quality,
        processingTimeSeconds:
          verificationResult.processingTimeSeconds,
      },
    });

  } catch (error) {
    console.error(
      "Verify attendance face error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Face verification failed",
    });
  }
};

// ==========================================
// GET PENDING ATTENDANCE REQUESTS
// ==========================================

const getPendingAttendanceRequests = async (
  req,
  res
) => {
  try {
    const attendanceDay = getAttendanceDay();

    const requests =
      await AttendanceRequest.find({
        status: "pending",
        attendanceDay,
      })
        .sort({
          createdAt: -1,
        })
        .select(
          "student enrollmentNumber studentName attendanceDay faceMatchScore attendanceFaceImage status createdAt"
        )
        .populate({
          path: "student",
          select: "registrationFaceImage",
        });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });

  } catch (error) {
    console.error(
      "Get pending attendance requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==========================================
// ADMIN REVIEW ATTENDANCE REQUEST
// ==========================================

const reviewAttendanceRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { decision } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Attendance request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid attendance request ID",
      });
    }

    if (
      decision !== "present" &&
      decision !== "absent"
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Decision must be either "present" or "absent"',
      });
    }

    if (
      !req.admin ||
      !req.admin.adminId
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Admin authentication is required",
      });
    }

    const attendanceRequest =
      await AttendanceRequest.findById(id);

    if (!attendanceRequest) {
      return res.status(404).json({
        success: false,
        message:
          "Attendance request not found",
      });
    }

    if (
      attendanceRequest.status !== "pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This attendance request has already been reviewed",
      });
    }

    const attendanceDay =
      getAttendanceDay();

    if (
      attendanceRequest.attendanceDay !==
      attendanceDay
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This attendance request is from a previous attendance day",
      });
    }

    const existingAttendance =
      await Attendance.findOne({
        student:
          attendanceRequest.student,
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

    const now = new Date();

    const attendance =
      await Attendance.create({
        student:
          attendanceRequest.student,
        enrollmentNumber:
          attendanceRequest.enrollmentNumber,
        studentName:
          attendanceRequest.studentName,
        attendanceDate:
          now,
        attendanceDay,
        status:
          decision,
        faceMatchScore:
          attendanceRequest.faceMatchScore,
        verificationMethod:
          "admin_review",
        reviewedBy:
          req.admin.adminId,
        reviewedAt:
          now,
      });

    attendanceRequest.status =
      decision;

    attendanceRequest.reviewedBy =
      req.admin.adminId;

    attendanceRequest.reviewedAt =
      now;

    await attendanceRequest.save();

    // Log admin approval or rejection in MySQL
    await logActivity({
      req,
      adminId: req.admin.adminId,
      action:
        decision === "present"
          ? "ATTENDANCE_APPROVED"
          : "ATTENDANCE_REJECTED",
      entityType: "AttendanceRequest",
      entityId: attendanceRequest._id,
      details: {
        studentName:
          attendanceRequest.studentName,
        enrollmentNumber:
          attendanceRequest.enrollmentNumber,
        decision,
        attendanceId: attendance._id.toString(),
        faceMatchScore:
          attendanceRequest.faceMatchScore,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Attendance marked " +
        decision,
      data: {
        requestId:
          attendanceRequest._id,
        attendanceId:
          attendance._id,
        studentName:
          attendanceRequest.studentName,
        enrollmentNumber:
          attendanceRequest.enrollmentNumber,
        attendanceDay:
          attendanceRequest.attendanceDay,
        faceMatchScore:
          attendance.faceMatchScore,
        status:
          attendance.status,
        verificationMethod:
          attendance.verificationMethod,
        reviewedBy:
          attendance.reviewedBy,
        reviewedAt:
          attendance.reviewedAt,
        attendanceDate:
          attendance.attendanceDate,
      },
    });

  } catch (error) {
    console.error(
      "Review attendance request error:",
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
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createAttendanceRequest,
  verifyAttendanceFace,
  getPendingAttendanceRequests,
  reviewAttendanceRequest,
};
