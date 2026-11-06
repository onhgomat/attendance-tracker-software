import base64
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from pymongo import MongoClient


# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

IMAGE_PATH = BASE_DIR / "test.jpeg"

BACKEND_ENV_PATH = BASE_DIR.parent / "backend" / ".env"

FACE_SERVICE_URL = "http://127.0.0.1:8000/verify-face"

ENROLLMENT_NUMBER = "IEM2024001"


# ==========================================
# LOAD BACKEND .ENV
# ==========================================

if not BACKEND_ENV_PATH.exists():
    print("ERROR: Backend .env file was not found.")
    print(f"Expected location: {BACKEND_ENV_PATH}")
    raise SystemExit(1)

load_dotenv(BACKEND_ENV_PATH)

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("ERROR: MONGO_URI was not found in backend/.env")
    raise SystemExit(1)


# ==========================================
# CHECK TEST IMAGE
# ==========================================

if not IMAGE_PATH.exists():
    print("ERROR: test.jpeg was not found.")
    print(f"Expected location: {IMAGE_PATH}")
    raise SystemExit(1)


# ==========================================
# CONNECT TO MONGODB
# ==========================================

print("==========================================")
print("ATTENDIFY FACE VERIFICATION TEST")
print("==========================================")
print()

print("Connecting to MongoDB...")

client = None

try:
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=10000
    )

    # Force connection test
    client.admin.command("ping")

    print("MongoDB connection successful.")

except Exception as error:
    print("ERROR: MongoDB connection failed.")
    print(error)

    if client:
        client.close()

    raise SystemExit(1)


# ==========================================
# SELECT DATABASE
# ==========================================

try:
    # Your current Mongoose connection is using
    # the "test" database.
    db = client["test"]

    students_collection = db["students"]

except Exception as error:
    print("ERROR: Could not access students collection.")
    print(error)

    client.close()
    raise SystemExit(1)


# ==========================================
# FIND STUDENT
# ==========================================

print()
print(f"Searching for student: {ENROLLMENT_NUMBER}")

try:
    student = students_collection.find_one(
        {
            "enrollmentNumber": ENROLLMENT_NUMBER
        },
        {
            "name": 1,
            "enrollmentNumber": 1,
            "faceRegistered": 1,
            "faceData": 1
        }
    )

except Exception as error:
    print("ERROR: Failed to query student.")
    print(error)

    client.close()
    raise SystemExit(1)


if not student:
    print()
    print("ERROR: Student was not found.")
    print(f"Enrollment number: {ENROLLMENT_NUMBER}")

    client.close()
    raise SystemExit(1)


# ==========================================
# CHECK FACE REGISTRATION
# ==========================================

student_name = student.get("name")
student_enrollment = student.get("enrollmentNumber")
face_registered = student.get("faceRegistered")
face_data = student.get("faceData")


print()
print("Student found.")
print(f"Name: {student_name}")
print(f"Enrollment: {student_enrollment}")
print(f"Face registered: {face_registered}")


if not face_registered:
    print()
    print("ERROR: Face is not registered for this student.")

    client.close()
    raise SystemExit(1)


# ==========================================
# VALIDATE REGISTERED EMBEDDING
# ==========================================

if not isinstance(face_data, list):
    print()
    print("ERROR: faceData is not stored as a list.")

    client.close()
    raise SystemExit(1)


embedding_length = len(face_data)

print(f"Registered embedding dimensions: {embedding_length}")


if embedding_length != 128:
    print()
    print(
        "ERROR: Registered embedding must contain exactly 128 values."
    )

    client.close()
    raise SystemExit(1)


# Validate embedding values
for index, value in enumerate(face_data):

    if not isinstance(value, (int, float)):
        print()
        print(
            f"ERROR: Invalid embedding value at index {index}."
        )

        client.close()
        raise SystemExit(1)

    if not isinstance(value, float) and not isinstance(value, int):
        print()
        print(
            f"ERROR: Invalid embedding value at index {index}."
        )

        client.close()
        raise SystemExit(1)


print("Registered embedding validation: PASSED")


# ==========================================
# READ TEST IMAGE
# ==========================================

print()
print(f"Reading image: {IMAGE_PATH.name}")

try:
    image_bytes = IMAGE_PATH.read_bytes()

except Exception as error:
    print("ERROR: Could not read test image.")
    print(error)

    client.close()
    raise SystemExit(1)


if len(image_bytes) == 0:
    print("ERROR: test.jpeg is empty.")

    client.close()
    raise SystemExit(1)


print(f"Image size: {len(image_bytes)} bytes")


# ==========================================
# CONVERT IMAGE TO BASE64
# ==========================================

try:
    image_base64 = base64.b64encode(
        image_bytes
    ).decode("utf-8")

except Exception as error:
    print("ERROR: Failed to encode image.")
    print(error)

    client.close()
    raise SystemExit(1)


print("Base64 conversion: PASSED")


# ==========================================
# PREPARE REQUEST
# ==========================================

payload = {
    "image": image_base64,
    "registeredEmbedding": face_data
}


print()
print("==========================================")
print("SENDING REQUEST TO FACE SERVICE")
print("==========================================")
print()
print(f"URL: {FACE_SERVICE_URL}")
print("Image: test.jpeg")
print("Registered embedding: 128 dimensions")
print()
print("Sending...")


# ==========================================
# CALL PYTHON FACE SERVICE
# ==========================================

try:

    response = requests.post(
        FACE_SERVICE_URL,
        json=payload,
        timeout=30
    )

except requests.exceptions.ConnectionError:
    print()
    print("ERROR: Could not connect to face service.")
    print()
    print("Make sure this is running:")
    print()
    print("    python app.py")
    print()
    print("and select:")
    print()
    print("    2. Run verification API")

    client.close()
    raise SystemExit(1)

except requests.exceptions.Timeout:
    print()
    print("ERROR: Face service request timed out.")

    client.close()
    raise SystemExit(1)

except requests.exceptions.RequestException as error:
    print()
    print("ERROR: Face service request failed.")
    print(error)

    client.close()
    raise SystemExit(1)


# ==========================================
# DISPLAY RESPONSE
# ==========================================

print()
print("==========================================")
print("FACE SERVICE RESPONSE")
print("==========================================")
print()

print(f"HTTP Status: {response.status_code}")
print()


try:

    result = response.json()

    # Never print biometric embedding data.
    result.pop("registeredEmbedding", None)
    result.pop("faceEmbedding", None)
    result.pop("embedding", None)

    print(
        json.dumps(
            result,
            indent=2
        )
    )

except ValueError:

    print("Raw response:")
    print(response.text)


# ==========================================
# INTERPRET BASIC RESULT
# ==========================================

print()
print("==========================================")
print("VERIFICATION SUMMARY")
print("==========================================")
print()

try:

    result = response.json()

    success = result.get("success")
    verified = result.get("verified")
    similarity = result.get("similarity")

    print(f"Success: {success}")
    print(f"Verified: {verified}")

    if similarity is not None:
        print(f"Similarity: {similarity}")

    quality = result.get("quality")

    if isinstance(quality, dict):

        print()
        print("Quality checks:")

        for key, value in quality.items():
            print(f"  {key}: {value}")

except Exception:
    pass


# ==========================================
# CLOSE DATABASE
# ==========================================

client.close()

print()
print("MongoDB connection closed.")
print()
print("Verification test completed.")