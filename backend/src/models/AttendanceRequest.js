const mongoose = require("mongoose");

const attendanceRequestSchema = new mongoose.Schema(
{
student: {
type: mongoose.Schema.Types.ObjectId,
ref: "Student",
required: true,
},

enrollmentNumber: {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
},

studentName: {
  type: String,
  required: true,
  trim: true,
},

attendanceDay: {
  type: String,
  required: true,
  trim: true,
},

faceMatchScore: {
  type: Number,
  required: true,
  min: 0,
  max: 100,
},

attendanceFaceImage: {
  type: String,
  default: null,
},

status: {
  type: String,
  enum: ["pending", "present", "absent"],
  default: "pending",
},

reviewedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Admin",
  default: null,
},

reviewedAt: {
  type: Date,
  default: null,
},

},
{
timestamps: true,
}
);

attendanceRequestSchema.index(
{
student: 1,
attendanceDay: 1,
status: 1,
}
);

const AttendanceRequest = mongoose.model(
"AttendanceRequest",
attendanceRequestSchema
);

module.exports = AttendanceRequest;