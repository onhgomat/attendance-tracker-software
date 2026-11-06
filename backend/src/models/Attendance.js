const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

attendanceDate: {
  type: Date,
  required: true,
},

attendanceDay: {
  type: String,
  required: true,
  trim: true,
},

status: {
  type: String,
  enum: ["present", "absent"],
  required: true,
},

faceMatchScore: {
  type: Number,
  min: 0,
  max: 100,
  default: null,
},

verificationMethod: {
  type: String,
  enum: [
    "face",
    "admin_review",
  ],
  required: true,
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

attendanceSchema.index(
{
student: 1,
attendanceDay: 1,
},
{
unique: true,
}
);

const Attendance = mongoose.model(
"Attendance",
attendanceSchema
);

module.exports = Attendance;