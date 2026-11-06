const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
{
name: {
type: String,
required: [true, "Student name is required"],
trim: true,
minlength: [2, "Name must contain at least 2 characters"],
maxlength: [100, "Name cannot exceed 100 characters"],
},

enrollmentNumber: {
  type: String,
  required: [true, "Enrollment number is required"],
  unique: true,
  trim: true,
  uppercase: true,
  maxlength: [50, "Enrollment number cannot exceed 50 characters"],
},

faceData: {
  type: [Number],
  default: null,
},

registrationFaceImage: {
  type: String,
  default: null,
},

faceRegistered: {
  type: Boolean,
  default: false,
},

faceRegisteredAt: {
  type: Date,
  default: null,
},

},
{
timestamps: true,
}
);

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;