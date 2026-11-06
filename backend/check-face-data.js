const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });
require("./src/dns");

const Student = require("./src/models/Student");

const checkFaceData = async () => {
try {
await mongoose.connect(process.env.MONGO_URI);

const student = await Student.findOne({
  enrollmentNumber: "IEM2024001"
}).select("name enrollmentNumber faceRegistered faceData");

if (!student) {
  console.log("Student not found");
  return;
}

console.log("Student found:", student.name);
console.log("Enrollment:", student.enrollmentNumber);
console.log("Face registered:", student.faceRegistered);

if (!Array.isArray(student.faceData)) {
  console.log("Face embedding does not exist");
  return;
}

console.log("Embedding exists: YES");
console.log("Embedding length:", student.faceData.length);

if (student.faceData.length === 128) {
  console.log("Embedding format: VALID");
} else {
  console.log("Embedding format: INVALID");
}

} catch (error) {
console.error("Error:", error.message);
} finally {
await mongoose.disconnect();
}
};

checkFaceData();