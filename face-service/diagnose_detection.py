import cv2
from pathlib import Path


# ==========================================
# PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

IMAGE_PATH = BASE_DIR / "test.jpeg"

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "face_detection_yunet_2023mar.onnx"
)


# ==========================================
# CHECK FILES
# ==========================================

if not IMAGE_PATH.exists():
    print("ERROR: test.jpeg not found.")
    raise SystemExit(1)

if not MODEL_PATH.exists():
    print("ERROR: YuNet model not found.")
    print(MODEL_PATH)
    raise SystemExit(1)


# ==========================================
# LOAD IMAGE
# ==========================================

image = cv2.imread(str(IMAGE_PATH))

if image is None:
    print("ERROR: OpenCV could not read test.jpeg.")
    raise SystemExit(1)

height, width = image.shape[:2]

print("==========================================")
print("YUNET FACE DETECTION DIAGNOSTIC")
print("==========================================")
print()
print(f"Image width : {width}")
print(f"Image height: {height}")
print(f"Channels    : {image.shape[2]}")
print()


# ==========================================
# CREATE YUNET DETECTOR
# ==========================================

detector = cv2.FaceDetectorYN.create(
    str(MODEL_PATH),
    "",
    (320, 320),
    0.6,
    0.3,
    5000
)

if detector is None:
    print("ERROR: Could not create YuNet detector.")
    raise SystemExit(1)


# ==========================================
# SET ORIGINAL IMAGE SIZE
# ==========================================

detector.setInputSize(
    (width, height)
)


# ==========================================
# RUN DETECTION
# ==========================================

_, faces = detector.detect(image)


# ==========================================
# DISPLAY RESULTS
# ==========================================

print("Detection completed.")
print()

if faces is None:

    print("Faces detected: 0")
    print()
    print("YuNet did not detect any face.")

else:

    print(f"Faces detected: {len(faces)}")
    print()

    for index, face in enumerate(faces):

        x, y, w, h = face[:4]

        print(f"Face #{index + 1}")
        print(f"  x      : {x:.2f}")
        print(f"  y      : {y:.2f}")
        print(f"  width  : {w:.2f}")
        print(f"  height : {h:.2f}")
        print(f"  score  : {face[14]:.4f}")
        print()

        print("Landmarks:")
        print(f"  Right eye : ({face[4]:.2f}, {face[5]:.2f})")
        print(f"  Left eye  : ({face[6]:.2f}, {face[7]:.2f})")
        print(f"  Nose      : ({face[8]:.2f}, {face[9]:.2f})")
        print(f"  Mouth     : ({face[10]:.2f}, {face[11]:.2f})")
        print()

# ==========================================
# TRY LOWER DETECTION THRESHOLDS
# ==========================================

print("==========================================")
print("LOWER THRESHOLD TEST")
print("==========================================")
print()

for confidence in [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]:

    detector = cv2.FaceDetectorYN.create(
        str(MODEL_PATH),
        "",
        (320, 320),
        confidence,
        0.3,
        5000
    )

    detector.setInputSize(
        (width, height)
    )

    _, test_faces = detector.detect(image)

    count = (
        0
        if test_faces is None
        else len(test_faces)
    )

    print(
        f"Confidence {confidence:.1f} -> "
        f"{count} face(s)"
    )