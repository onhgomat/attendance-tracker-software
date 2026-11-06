const fs = require("fs");
const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });
require("./src/dns");

const Student = require("./src/models/Student");

const test = async () => {
try {
await mongoose.connect(process.env.MONGO_URI);

const targetStudent = await Student.findOne({
  enrollmentNumber: "IEM2024002"
}).select("name enrollmentNumber faceRegistered");

if (!targetStudent) {
  throw new Error("Test student not found");
}

console.log("Target student:", targetStudent.name);
console.log("Enrollment:", targetStudent.enrollmentNumber);
console.log("Face already registered:", targetStudent.faceRegistered);

if (targetStudent.faceRegistered) {
  throw new Error(
    "Test student already has a registered face. Stopping test."
  );
}

const rahul = await Student.findOne({
  enrollmentNumber: "IEM2024001"
}).select("faceData");

if (!rahul || !Array.isArray(rahul.faceData)) {
  throw new Error("Rahul's registered embedding was not found");
}

console.log("Rahul embedding found: YES");
console.log("Embedding length:", rahul.faceData.length);

const duplicateStudent = await Student.find({
  faceRegistered: true,
  faceData: { $exists: true, $ne: null },
  enrollmentNumber: {
    $ne: "IEM2024002"
  }
}).select("enrollmentNumber faceData");

const cosineSimilarity = (a, b) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (
    Math.sqrt(normA) * Math.sqrt(normB)
  );
};

console.log("");
console.log("Testing Rahul's face against registered students...");

for (const student of duplicateStudent) {
  if (
    !Array.isArray(student.faceData) ||
    student.faceData.length !== 128
  ) {
    continue;
  }

  const similarity = cosineSimilarity(
    rahul.faceData,
    student.faceData
  );

  console.log(
    "Comparison with:",
    student.enrollmentNumber
  );

  console.log(
    "Similarity:",
    similarity.toFixed(4)
  );

  if (similarity >= 0.80) {
    console.log("");
    console.log("DUPLICATE FACE DETECTED");
    console.log("Cross-student protection: PASSED");
    console.log(
      "Rahul's face cannot be assigned to another student."
    );
    return;
  }
}

console.log("");
console.log("DUPLICATE FACE NOT DETECTED");
console.log(
  "Cross-student protection requires further investigation."
);

} catch (error) {
console.error("Test failed:", error.message);
} finally {
await mongoose.disconnect();
}
};

test();