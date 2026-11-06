import React, { useEffect, useRef, useState } from "react";

const BACKEND_URL = "http://localhost:5000";
const FACE_SERVICE_URL = "http://127.0.0.1:8000";

function AdminStudents() {
const [step, setStep] = useState(1);

const [name, setName] = useState("");
const [enrollmentNumber, setEnrollmentNumber] = useState("");

const [student, setStudent] = useState(null);

const [loading, setLoading] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const [cameraActive, setCameraActive] = useState(false);
const [samples, setSamples] = useState([]);
const [capturing, setCapturing] = useState(false);

const videoRef = useRef(null);
const streamRef = useRef(null);

const getAdminToken = () => {
return sessionStorage.getItem("adminToken");
};

const stopCamera = () => {
if (streamRef.current) {
streamRef.current.getTracks().forEach((track) => {
track.stop();
});

  streamRef.current = null;
}

if (videoRef.current) {
  videoRef.current.srcObject = null;
}

setCameraActive(false);

};

useEffect(() => {
return () => {
stopCamera();
};
}, []);

const registerStudent = async (event) => {
event.preventDefault();

setError("");
setMessage("");

const token = getAdminToken();

if (!token) {
  setError("Admin authentication is required.");
  return;
}

if (!name.trim() || !enrollmentNumber.trim()) {
  setError("Name and enrollment number are required.");
  return;
}

try {
  setLoading(true);

  const response = await fetch(
    `${BACKEND_URL}/api/students/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        enrollmentNumber: enrollmentNumber.trim(),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Student registration failed."
    );
  }

  setStudent(data.data);
  setMessage("Student created successfully.");
  setStep(2);
} catch (err) {
  setError(
    err.message || "Student registration failed."
  );
} finally {
  setLoading(false);
}

};

const startCamera = async () => {
setError("");
setMessage("");

try {
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error(
      "Camera access is not supported by this browser."
    );
  }

  const stream =
    await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: 640,
        },
        height: {
          ideal: 480,
        },
        facingMode: "user",
      },
      audio: false,
    });

  streamRef.current = stream;

  if (videoRef.current) {
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
  }

  setCameraActive(true);
  setSamples([]);
} catch (err) {
  setError(
    err.message ||
      "Unable to access the camera. Please allow camera permission."
  );
}

};

const captureSample = () => {
if (!videoRef.current) {
setError("Camera is not available.");
return;
}

if (!cameraActive) {
  setError("Please start the camera first.");
  return;
}

if (samples.length >= 5) {
  setError(
    "All 5 samples have already been captured."
  );
  return;
}

const video = videoRef.current;

if (
  video.readyState < 2 ||
  video.videoWidth === 0 ||
  video.videoHeight === 0
) {
  setError(
    "Camera is not ready yet. Please wait."
  );
  return;
}

const canvas = document.createElement("canvas");

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

const context = canvas.getContext("2d");

if (!context) {
  setError("Unable to capture camera frame.");
  return;
}

context.drawImage(
  video,
  0,
  0,
  canvas.width,
  canvas.height
);

const image = canvas.toDataURL(
  "image/jpeg",
  0.9
);

setSamples((previousSamples) => [
  ...previousSamples,
  image,
]);

setMessage(
  `Face sample ${samples.length + 1} of 5 captured.`
);

};

const generateFaceTemplate = async () => {
setError("");
setMessage("");

if (samples.length !== 5) {
  setError(
    "Exactly 5 face samples are required."
  );
  return;
}

try {
  setCapturing(true);

  const response = await fetch(
    `${FACE_SERVICE_URL}/generate-registration-template`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: samples,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        "Face template generation failed."
    );
  }

  const embedding = data.embedding;

  if (
    !Array.isArray(embedding) ||
    embedding.length !== 128
  ) {
    throw new Error(
      "Python face service returned an invalid embedding."
    );
  }

  await saveFaceEmbedding(embedding);
} catch (err) {
  setError(
    err.message ||
      "Unable to generate the face template."
  );
} finally {
  setCapturing(false);
}

};

const saveFaceEmbedding = async (embedding) => {
const token = getAdminToken();

if (!token) {
  throw new Error(
    "Admin authentication is required."
  );
}

if (!student?.enrollmentNumber) {
  throw new Error(
    "Student information is missing."
  );
}

if (!samples.length) {
  throw new Error(
    "Registration face image is missing."
  );
}

const registrationFaceImage = samples[0];

const response = await fetch(
  `${BACKEND_URL}/api/students/register-face`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      enrollmentNumber:
        student.enrollmentNumber,
      embedding,
      registrationFaceImage,
    }),
  }
);

const data = await response.json();

if (!response.ok || !data.success) {
  throw new Error(
    data.message ||
      "Face registration failed."
  );
}

stopCamera();

setStep(3);

setMessage(
  "Student and face registered successfully."
);

};

const resetRegistration = () => {
stopCamera();

setStep(1);
setName("");
setEnrollmentNumber("");
setStudent(null);
setSamples([]);
setMessage("");
setError("");

};

return (
<div className="min-h-screen bg-slate-950 text-white">
<nav className="border-b border-white/10">
<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
<div>
<h1 className="text-xl font-bold">
Attendify
</h1>

        <p className="text-xs text-slate-400">
          Admin Student Registration
        </p>
      </div>

      <a
        href="/admin/dashboard"
        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
      >
        Dashboard
      </a>
    </div>
  </nav>

  <main className="mx-auto max-w-6xl px-6 py-10">
    <div className="mb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-400">
        Admin Portal
      </p>

      <h2 className="mt-3 text-3xl font-bold">
        Register Student
      </h2>

      <p className="mt-2 max-w-2xl text-slate-400">
        Create the student record and securely
        register five face samples for biometric
        verification.
      </p>
    </div>

    <div className="mb-8 grid grid-cols-3 gap-3">
      <div
        className={`rounded-xl border p-4 ${
          step >= 1
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-white/10 bg-slate-900"
        }`}
      >
        <p className="text-xs text-slate-400">
          Step 1
        </p>

        <p className="mt-1 font-semibold">
          Student Details
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 ${
          step >= 2
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-white/10 bg-slate-900"
        }`}
      >
        <p className="text-xs text-slate-400">
          Step 2
        </p>

        <p className="mt-1 font-semibold">
          Face Registration
        </p>
      </div>

      <div
        className={`rounded-xl border p-4 ${
          step >= 3
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-white/10 bg-slate-900"
        }`}
      >
        <p className="text-xs text-slate-400">
          Step 3
        </p>

        <p className="mt-1 font-semibold">
          Completed
        </p>
      </div>
    </div>

    {message && (
      <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
        {message}
      </div>
    )}

    {error && (
      <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
        {error}
      </div>
    )}

    {step === 1 && (
      <div className="max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-7">
        <form
          onSubmit={registerStudent}
          className="space-y-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Student Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter student name"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Enrollment Number
            </label>

            <input
              type="text"
              value={enrollmentNumber}
              onChange={(event) =>
                setEnrollmentNumber(
                  event.target.value
                )
              }
              placeholder="Example: IEM2026003"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-500 px-5 py-3.5 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Creating Student..."
              : "Continue to Face Registration"}
          </button>
        </form>
      </div>
    )}

    {step === 2 && (
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="mb-5">
            <p className="text-sm text-slate-400">
              Registering
            </p>

            <h3 className="mt-1 text-xl font-bold">
              {student?.name}
            </h3>

            <p className="mt-1 text-sm text-indigo-400">
              {student?.enrollmentNumber}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold transition hover:bg-indigo-400"
              >
                Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={captureSample}
                disabled={samples.length >= 5}
                className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Capture Sample
              </button>
            )}

            {cameraActive && (
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Stop Camera
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Face Samples
              </span>

              <span className="text-sm font-semibold text-white">
                {samples.length} / 5
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{
                  width: `${
                    (samples.length / 5) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {samples.length === 5 && (
            <button
              type="button"
              onClick={generateFaceTemplate}
              disabled={capturing}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {capturing
                ? "Processing Face Samples..."
                : "Register Face"}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h3 className="text-lg font-bold">
            Registration Guidelines
          </h3>

          <div className="mt-5 space-y-4 text-sm text-slate-400">
            <div>
              <p className="font-semibold text-white">
                1. Face the camera
              </p>

              <p className="mt-1">
                Keep the student's face clearly
                visible inside the camera frame.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">
                2. Good lighting
              </p>

              <p className="mt-1">
                Avoid very dark or extremely bright
                environments.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">
                3. One person only
              </p>

              <p className="mt-1">
                Only the student being registered
                should appear in the frame.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white">
                4. Capture five samples
              </p>

              <p className="mt-1">
                The face service will check quality
                and consistency across all five
                samples.
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
            <p className="text-sm font-semibold text-indigo-300">
              Biometric protection
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              The Python service processes the face
              images and returns a 128-dimensional
              face template. Student identity is
              handled by the backend.
            </p>
          </div>
        </div>
      </div>
    )}

    {step === 3 && (
      <div className="max-w-2xl rounded-2xl border border-emerald-500/20 bg-slate-900 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl text-emerald-400">
          ✓
        </div>

        <h3 className="mt-5 text-2xl font-bold">
          Registration Complete
        </h3>

        <p className="mt-3 text-slate-400">
          {student?.name} has been registered with
          enrollment number{" "}
          <span className="font-semibold text-white">
            {student?.enrollmentNumber}
          </span>
          .
        </p>

        <p className="mt-2 text-sm text-slate-500">
          The student's face template and
          representative registration face are now
          stored and can be used for attendance
          verification and admin review.
        </p>

        <button
          type="button"
          onClick={resetRegistration}
          className="mt-7 rounded-xl bg-indigo-500 px-6 py-3 font-semibold transition hover:bg-indigo-400"
        >
          Register Another Student
        </button>
      </div>
    )}
  </main>
</div>

);
}

export default AdminStudents;