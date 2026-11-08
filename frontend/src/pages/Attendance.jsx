import React, { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const FACE_SERVICE_URL = import.meta.env.VITE_FACE_SERVICE_URL || "http://127.0.0.1:8000";

const LIVENESS_SEQUENCE = ["left", "right", "center"];

function Attendance() {
const videoRef = useRef(null);
const canvasRef = useRef(null);
const streamRef = useRef(null);

const cameraActiveRef = useRef(false);
const livenessRunningRef = useRef(false);
const challengeIndexRef = useRef(0);

const [enrollmentNumber, setEnrollmentNumber] = useState("");

const [cameraReady, setCameraReady] = useState(false);

const [currentChallenge, setCurrentChallenge] = useState("left");

const [livenessStatus, setLivenessStatus] =
useState("waiting");

const [livenessMessage, setLivenessMessage] =
useState("Please look LEFT");

const [loading, setLoading] = useState(false);

const [message, setMessage] = useState("");

const [result, setResult] = useState(null);

useEffect(() => {
startCamera();

return () => {
  stopCamera();
};

}, []);

const startCamera = async () => {
try {
setMessage("");

  setLivenessStatus("waiting");
  setCurrentChallenge("left");
  setLivenessMessage("Starting camera...");

  challengeIndexRef.current = 0;
  cameraActiveRef.current = false;
  livenessRunningRef.current = false;

  const stream =
    await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: {
          ideal: 640
        },
        height: {
          ideal: 480
        }
      },
      audio: false
    });

  streamRef.current = stream;
  cameraActiveRef.current = true;

  if (!videoRef.current) {
    throw new Error(
      "Video element is not available."
    );
  }

  videoRef.current.srcObject = stream;

  await new Promise((resolve) => {
    const video = videoRef.current;

    if (video.readyState >= 2) {
      resolve();
      return;
    }

    video.onloadedmetadata = () => {
      resolve();
    };
  });

  await videoRef.current.play();

  setCameraReady(true);

  setLivenessStatus("checking");
  setCurrentChallenge("left");
  setLivenessMessage("Please look LEFT");

  setTimeout(() => {
    if (cameraActiveRef.current) {
      startLivenessVerification();
    }
  }, 1000);
} catch (error) {
  console.error(
    "Camera error:",
    error
  );

  cameraActiveRef.current = false;

  setCameraReady(false);

  setLivenessStatus("failed");

  setLivenessMessage(
    "Camera could not be started."
  );

  if (
    error?.name === "NotAllowedError"
  ) {
    setMessage(
      "Camera permission was denied. Please allow camera access in your browser."
    );
  } else if (
    error?.name === "NotFoundError"
  ) {
    setMessage(
      "No camera was found on this device."
    );
  } else if (
    error?.name === "NotReadableError"
  ) {
    setMessage(
      "The camera is being used by another application."
    );
  } else {
    setMessage(
      "Camera access failed. Please check your browser camera settings."
    );
  }
}

};

const stopCamera = () => {
cameraActiveRef.current = false;
livenessRunningRef.current = false;

if (streamRef.current) {
  streamRef.current
    .getTracks()
    .forEach((track) => {
      track.stop();
    });

  streamRef.current = null;
}

setCameraReady(false);

};

const captureImage = () => {
if (
!videoRef.current ||
!canvasRef.current
) {
throw new Error(
"Camera is not ready."
);
}

const video = videoRef.current;
const canvas = canvasRef.current;

if (
  !video.videoWidth ||
  !video.videoHeight
) {
  throw new Error(
    "Camera video is not ready."
  );
}

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

const context =
  canvas.getContext("2d");

if (!context) {
  throw new Error(
    "Could not access camera canvas."
  );
}

context.drawImage(
  video,
  0,
  0,
  canvas.width,
  canvas.height
);

return canvas.toDataURL(
  "image/jpeg",
  0.85
);

};

const updateChallengeUI = (
challenge
) => {
setCurrentChallenge(challenge);

if (challenge === "left") {
  setLivenessMessage(
    "Please look LEFT"
  );
}

if (challenge === "right") {
  setLivenessMessage(
    "Please look RIGHT"
  );
}

if (challenge === "center") {
  setLivenessMessage(
    "Please look CENTER"
  );
}

};

const startLivenessVerification =
async () => {
if (
livenessRunningRef.current
) {
return;
}

  if (
    !cameraActiveRef.current
  ) {
    return;
  }

  livenessRunningRef.current =
    true;

  setLivenessStatus("checking");

  challengeIndexRef.current = 0;

  updateChallengeUI("left");

  let failures = 0;

  while (
    cameraActiveRef.current &&
    challengeIndexRef.current <
      LIVENESS_SEQUENCE.length
  ) {
    const challenge =
      LIVENESS_SEQUENCE[
        challengeIndexRef.current
      ];

    updateChallengeUI(
      challenge
    );

    try {
      const image =
        captureImage();

      console.log(
        "Sending liveness challenge:",
        challenge
      );

      const response =
        await fetch(
          `${FACE_SERVICE_URL}/check-liveness`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              image: image,
              challenge:
                challenge
            })
          }
        );

      const data =
        await response.json();

      console.log(
        "Liveness response:",
        data
      );

      if (!response.ok) {
        failures++;

        if (failures >= 5) {
          setLivenessStatus(
            "failed"
          );

          setLivenessMessage(
            data.message ||
              "Liveness verification failed."
          );

          livenessRunningRef.current =
            false;

          return;
        }

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              700
            )
        );

        continue;
      }

      failures = 0;

      if (
        data.qualityOk ===
        false
      ) {
        setLivenessStatus(
          "checking"
        );

        setLivenessMessage(
          data.message ||
            `Please look ${challenge.toUpperCase()}`
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              700
            )
        );

        continue;
      }

      if (
        data.livenessPassed ===
        true
      ) {
        console.log(
          "Challenge passed:",
          challenge
        );

        if (
          challengeIndexRef.current <
          LIVENESS_SEQUENCE.length -
            1
        ) {
          challengeIndexRef.current +=
            1;

          const nextChallenge =
            LIVENESS_SEQUENCE[
              challengeIndexRef.current
            ];

          console.log(
            "Moving to:",
            nextChallenge
          );

          updateChallengeUI(
            nextChallenge
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                500
              )
          );
        } else {
          setCurrentChallenge(
            "completed"
          );

          setLivenessStatus(
            "passed"
          );

          setLivenessMessage(
            "Liveness verified successfully."
          );

          console.log(
            "LIVENESS COMPLETED"
          );

          livenessRunningRef.current =
            false;

          return;
        }
      } else {
        setLivenessStatus(
          "checking"
        );

        updateChallengeUI(
          challenge
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              700
            )
        );
      }
    } catch (error) {
      console.error(
        "Liveness error:",
        error
      );

      failures++;

      if (failures >= 5) {
        setLivenessStatus(
          "failed"
        );

        setLivenessMessage(
          "Could not connect to the face verification service."
        );

        livenessRunningRef.current =
          false;

        return;
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            700
          )
      );
    }
  }

  livenessRunningRef.current =
    false;
};

const handleVerify = async () => {
setMessage("");
setResult(null);

const enrollment =
  enrollmentNumber.trim();

if (!enrollment) {
  setMessage(
    "Please enter your enrollment number."
  );

  return;
}

if (!cameraReady) {
  setMessage(
    "Camera is not ready."
  );

  return;
}

if (
  livenessStatus !==
  "passed"
) {
  setMessage(
    "Please complete the LEFT → RIGHT → CENTER liveness verification first."
  );

  return;
}

try {
  setLoading(true);

  const image =
    captureImage();

  console.log(
    "Sending attendance verification..."
  );

  console.log(
    "Enrollment:",
    enrollment
  );

  console.log(
    "Image size:",
    image.length
  );

  const response =
    await fetch(
      `${API_URL}/api/attendance/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          enrollmentNumber:
            enrollment,
          image: image
        })
      }
    );

  const data =
    await response.json();

  console.log(
    "Backend response:",
    data
  );

  setResult(data);

  if (!response.ok) {
    setMessage(
      data.message ||
        "Attendance verification failed."
    );

    return;
  }

  if (
    data.data?.status ===
    "present"
  ) {
    setMessage(
      "Attendance marked successfully."
    );
  } else if (
    data.data?.status ===
    "pending"
  ) {
    setMessage(
      "Face verification needs admin review."
    );
  } else {
    setMessage(
      data.message ||
        "Verification completed."
    );
  }
} catch (error) {
  console.error(
    "Attendance verification error:",
    error
  );

  setMessage(
    "Could not connect to the attendance backend."
  );
} finally {
  setLoading(false);
}

};

const getChallengeStyle =
(challenge) => {
const index =
LIVENESS_SEQUENCE.indexOf(
challenge
);

  const currentIndex =
    challengeIndexRef.current;

  if (
    livenessStatus ===
      "passed" ||
    index <
      currentIndex
  ) {
    return "border-green-500/40 bg-green-500/10 text-green-400";
  }

  if (
    currentChallenge ===
      challenge &&
    livenessStatus !==
      "passed"
  ) {
    return "border-indigo-500 bg-indigo-500/20 text-indigo-300";
  }

  return "border-white/10 bg-slate-950 text-slate-500";
};

return (
<div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
<div className="mx-auto max-w-4xl">

    <div className="mb-8">
      <a
        href="/"
        className="text-sm text-slate-400 hover:text-white"
      >
        ← Back to Home
      </a>

      <h1 className="mt-5 text-4xl font-bold">
        Mark Attendance
      </h1>

      <p className="mt-2 text-slate-400">
        Enter your enrollment number and complete the face liveness verification.
      </p>
    </div>

    <div className="grid gap-8 md:grid-cols-2">

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">

        <label className="mb-2 block text-sm font-medium text-slate-300">
          Enrollment Number
        </label>

        <input
          type="text"
          value={
            enrollmentNumber
          }
          onChange={(event) =>
            setEnrollmentNumber(
              event.target.value
            )
          }
          placeholder="Example: IEM2024001"
          className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full object-cover"
          />

        </div>

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        <div className="mt-4 flex items-center gap-2 text-sm">

          <div
            className={`h-2.5 w-2.5 rounded-full ${
              cameraReady
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />

          <span className="text-slate-400">
            {cameraReady
              ? "Camera ready"
              : "Camera not available"}
          </span>

        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-4">

          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Liveness Verification
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">

            <div
              className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${getChallengeStyle(
                "left"
              )}`}
            >
              LEFT
            </div>

            <div
              className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${getChallengeStyle(
                "right"
              )}`}
            >
              RIGHT
            </div>

            <div
              className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold ${getChallengeStyle(
                "center"
              )}`}
            >
              CENTER
            </div>

          </div>

          <div className="mt-4 text-center">

            <p
              className={`text-lg font-bold ${
                livenessStatus ===
                "passed"
                  ? "text-green-400"
                  : livenessStatus ===
                    "failed"
                  ? "text-red-400"
                  : "text-indigo-400"
              }`}
            >
              {livenessMessage}
            </p>

            {livenessStatus ===
              "checking" && (
              <p className="mt-1 text-xs text-slate-500">
                Keep your face clearly visible in the camera.
              </p>
            )}

            {livenessStatus ===
              "passed" && (
              <p className="mt-1 text-xs text-green-500">
                You can now verify your attendance.
              </p>
            )}

          </div>

        </div>

        <button
          onClick={
            handleVerify
          }
          disabled={
            loading ||
            !cameraReady ||
            livenessStatus !==
              "passed"
          }
          className="mt-6 w-full rounded-xl bg-indigo-500 px-5 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Verifying..."
            : livenessStatus ===
              "passed"
            ? "Verify & Mark Attendance"
            : "Complete Liveness First"}
        </button>

      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">

        <h2 className="text-xl font-semibold">
          Verification Status
        </h2>

        {!message &&
          !result && (
            <div className="mt-8 rounded-xl border border-dashed border-white/10 p-6 text-center text-slate-500">
              Your verification result will appear here.
            </div>
          )}

        {message && (
          <div className="mt-6 rounded-xl border border-white/10 bg-slate-950 p-5">
            <p className="text-slate-200">
              {message}
            </p>
          </div>
        )}

        {result?.data && (
          <div className="mt-6 space-y-4">

            {result.data
              .faceMatchScore !==
              undefined && (
              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-slate-400">
                  Face Match Score
                </span>

                <span className="text-xl font-bold text-indigo-400">
                  {
                    result
                      .data
                      .faceMatchScore
                  }
                </span>
              </div>
            )}

            {result.data.status && (
              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-slate-400">
                  Status
                </span>

                <span className="font-semibold">
                  {
                    result
                      .data
                      .status
                  }
                </span>
              </div>
            )}

            {result.data
              .verificationMethod && (
              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-slate-400">
                  Verification
                </span>

                <span className="font-semibold">
                  {
                    result
                      .data
                      .verificationMethod
                  }
                </span>
              </div>
            )}

            {result.data
              .attendanceId && (
              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Attendance ID
                </p>

                <p className="mt-1 break-all text-sm text-slate-300">
                  {
                    result
                      .data
                      .attendanceId
                  }
                </p>
              </div>
            )}

          </div>
        )}

      </div>

    </div>

  </div>
</div>

);
}

export default Attendance;