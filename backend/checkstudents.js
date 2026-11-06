const dns = require("./src/dns");
require("dotenv").config({ path: "./.env" });

const mongoose = require("mongoose");

async function checkStudents() {
try {
await mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection.db;

const students = await db
  .collection("students")
  .find({})
  .project({
    name: 1,
    enrollmentNumber: 1,
    faceRegistered: 1
  })
  .toArray();

console.log("\nSTUDENTS FOUND:", students.length);
console.log("----------------------------------------");

students.forEach((student, index) => {
  console.log(
    `${index + 1}. ${student.name} | ${student.enrollmentNumber} | faceRegistered=${student.faceRegistered}`
  );
});

console.log("----------------------------------------");

await mongoose.disconnect();

console.log("MongoDB disconnected.");

} catch (error) {
console.error("Error:", error.message);
process.exit(1);
}
}

checkStudents();