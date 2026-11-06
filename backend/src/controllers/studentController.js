const Student = require("../models/Student");

const cosineSimilarity = (a, b) => {
if (!Array.isArray(a) || !Array.isArray(b)) {
return 0;
}

if (a.length !== b.length) {
return 0;
}

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

return (
dotProduct /
(Math.sqrt(normA) * Math.sqrt(normB))
);
};

const registerStudent = async (req, res) => {
try {
const { name, enrollmentNumber } = req.body || {};

if (
  typeof name !== "string" ||
  typeof enrollmentNumber !== "string" ||
  !name.trim() ||
  !enrollmentNumber.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Name and enrollment number are required",
  });
}

const normalizedName = name.trim();

const normalizedEnrollment =
  enrollmentNumber.trim().toUpperCase();

const existingStudent = await Student.findOne({
  enrollmentNumber: normalizedEnrollment,
});

if (existingStudent) {
  return res.status(409).json({
    success: false,
    message:
      "A student with this enrollment number already exists",
  });
}

const student = await Student.create({
  name: normalizedName,
  enrollmentNumber: normalizedEnrollment,
  faceData: null,
  registrationFaceImage: null,
  faceRegistered: false,
  faceRegisteredAt: null,
});

return res.status(201).json({
  success: true,
  message: "Student registered successfully",
  data: {
    id: student._id,
    name: student.name,
    enrollmentNumber: student.enrollmentNumber,
    faceRegistered: student.faceRegistered,
    createdAt: student.createdAt,
  },
});

} catch (error) {
console.error(
"Student registration error:",
error
);

if (error.code === 11000) {
  return res.status(409).json({
    success: false,
    message:
      "A student with this enrollment number already exists",
  });
}

return res.status(500).json({
  success: false,
  message: "Internal server error",
});

}
};

const registerFace = async (req, res) => {
try {
const {
enrollmentNumber,
embedding,
registrationFaceImage,
} = req.body || {};

if (
  typeof enrollmentNumber !== "string" ||
  !enrollmentNumber.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Enrollment number is required",
  });
}

if (
  !Array.isArray(embedding) ||
  embedding.length !== 128
) {
  return res.status(400).json({
    success: false,
    message:
      "A valid 128-dimensional face embedding is required",
  });
}

const validEmbedding = embedding.every(
  (value) =>
    typeof value === "number" &&
    Number.isFinite(value)
);

if (!validEmbedding) {
  return res.status(400).json({
    success: false,
    message:
      "Embedding contains invalid values",
  });
}

if (
  typeof registrationFaceImage !== "string" ||
  !registrationFaceImage.trim()
) {
  return res.status(400).json({
    success: false,
    message:
      "Registration face image is required",
  });
}

if (
  !registrationFaceImage.startsWith(
    "data:image/"
  )
) {
  return res.status(400).json({
    success: false,
    message:
      "Registration face image must be a valid image data URL",
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
    message:
      "Student with this enrollment number was not found",
  });
}

if (student.faceRegistered) {
  return res.status(409).json({
    success: false,
    message:
      "Face is already registered for this student",
  });
}

const embeddingNorm = Math.sqrt(
  embedding.reduce(
    (sum, value) =>
      sum + value * value,
    0
  )
);

if (
  !Number.isFinite(embeddingNorm) ||
  embeddingNorm <= 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Embedding has an invalid norm",
  });
}

const registeredStudents = await Student.find({
  faceRegistered: true,
  faceData: {
    $exists: true,
    $ne: null,
  },
  enrollmentNumber: {
    $ne: normalizedEnrollment,
  },
}).select(
  "enrollmentNumber faceData"
);

const DUPLICATE_THRESHOLD = 0.80;

let highestSimilarity = -1;
let duplicateEnrollmentNumber = null;

for (
  const registeredStudent
  of registeredStudents
) {
  if (
    !Array.isArray(
      registeredStudent.faceData
    )
  ) {
    continue;
  }

  if (
    registeredStudent.faceData.length !== 128
  ) {
    continue;
  }

  const similarity = cosineSimilarity(
    embedding,
    registeredStudent.faceData
  );

  if (
    similarity > highestSimilarity
  ) {
    highestSimilarity = similarity;

    duplicateEnrollmentNumber =
      registeredStudent.enrollmentNumber;
  }

  console.log(
    `Face comparison completed for registered student: ${registeredStudent.enrollmentNumber}`
  );

  if (
    similarity >= DUPLICATE_THRESHOLD
  ) {
    return res.status(409).json({
      success: false,
      duplicate: true,
      message:
        "This face is already registered to another student",
      highestSimilarity:
        Number(
          similarity.toFixed(4)
        ),
      duplicateEnrollmentNumber,
    });
  }
}

const normalizedEmbedding =
  embedding.map(
    (value) =>
      value / embeddingNorm
  );

student.faceData =
  normalizedEmbedding;

student.registrationFaceImage =
  registrationFaceImage.trim();

student.faceRegistered = true;

student.faceRegisteredAt =
  new Date();

await student.save();

return res.status(200).json({
  success: true,
  duplicate: false,
  message:
    "Face registered successfully",
  data: {
    id: student._id,
    name: student.name,
    enrollmentNumber:
      student.enrollmentNumber,
    faceRegistered:
      student.faceRegistered,
    faceRegisteredAt:
      student.faceRegisteredAt,
    registrationFaceImageSaved: true,
  },
});

} catch (error) {
console.error(
"Face registration error:",
error
);

return res.status(500).json({
  success: false,
  message:
    "Internal server error",
});

}
};

module.exports = {
registerStudent,
registerFace,
};