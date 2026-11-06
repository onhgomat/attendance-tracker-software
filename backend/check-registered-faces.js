const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });
require("./src/dns");

const Student = require("./src/models/Student");

const checkRegisteredFaces = async () => {
try {
await mongoose.connect(process.env.MONGO_URI);

const students = await Student.find({
  faceRegistered: true,
  faceData: { $exists: true, $ne: null }
}).select("name enrollmentNumber faceRegistered faceData");

console.log("Registered students:", students.length);
console.log("");

for (const student of students) {
  console.log("Name:", student.name);
  console.log("Enrollment:", student.enrollmentNumber);
  console.log("Face registered:", student.faceRegistered);
  console.log(
    "Embedding length:",
    Array.isArray(student.faceData)
      ? student.faceData.length
      : 0
  );
  console.log("------------------------------");
}

} catch (error) {
console.error("Error:", error.message);
} finally {
await mongoose.disconnect();
}
};

checkRegisteredFaces();