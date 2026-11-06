const dns = require("./src/dns");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./.env" });

const Attendance = require("./src/models/Attendance");

const migrateAttendanceDay = async () => {
try {
await mongoose.connect(process.env.MONGO_URI);

console.log("MongoDB connected");

const docs = await Attendance.find({
  attendanceDay: {
    $exists: false,
  },
});

console.log(
  "Records needing migration:",
  docs.length
);

for (const doc of docs) {
  const date = new Date(doc.attendanceDate);

  const attendanceDay = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  doc.attendanceDay = attendanceDay;

  await doc.save();

  console.log(
    "Updated:",
    doc._id.toString(),
    "->",
    attendanceDay
  );
}

console.log(
  "Attendance day migration completed successfully"
);

} catch (error) {
console.error(
"Attendance day migration failed:",
error
);
} finally {
await mongoose.disconnect();
console.log("MongoDB disconnected");
}
};
migrateAttendanceDay()