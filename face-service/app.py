
import base64
import os
import time

import cv2
import numpy as np
import requests
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS


app = Flask(__name__)

CORS(
    app,
    resources={
        r"/*": {
            "origins": "*"
        }
    },
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=False
)


# ============================================================
# CORS HANDLING
# ============================================================

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response("", 204)

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )
        response.headers["Access-Control-Max-Age"] = "3600"

        return response

    return None


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, OPTIONS"
    )
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization"
    )

    return response


# ============================================================
# PATHS AND CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

YU_NET_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "face_detection_yunet_2023mar.onnx"
)

SFACE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "face_recognition_sface_2021dec.onnx"
)


# Backend
BACKEND_URL = "http://localhost:5000"

FACE_REGISTRATION_ENDPOINT = (
    f"{BACKEND_URL}/api/students/register-face"
)


# Face service
FACE_SERVICE_HOST = "127.0.0.1"
FACE_SERVICE_PORT = 8000


# Camera registration
WINDOW_NAME = "Attendify - Face Registration"

MIN_FACE_WIDTH = 120
MIN_FACE_HEIGHT = 120

BLUR_THRESHOLD = 60.0

MIN_BRIGHTNESS = 50
MAX_BRIGHTNESS = 210

EDGE_MARGIN = 20

REQUIRED_SAMPLES = 5
SAMPLE_DELAY = 1.0

CONSISTENCY_THRESHOLD = 0.70


# YuNet
DETECTION_SCORE_THRESHOLD = 0.6
NMS_THRESHOLD = 0.3
TOP_K = 5000


# Liveness
LIVENESS_LEFT_THRESHOLD = 0.42
LIVENESS_RIGHT_THRESHOLD = 0.58

LIVENESS_CENTER_MIN = 0.43
LIVENESS_CENTER_MAX = 0.57

LIVENESS_MIN_FACE_SIZE = 120


# ============================================================
# MODEL CREATION
# ============================================================

def create_detector():
    if not os.path.exists(YU_NET_MODEL_PATH):
        raise FileNotFoundError(
            "YuNet model not found: "
            f"{YU_NET_MODEL_PATH}"
        )

    print("Loading YuNet face detector...")

    detector = cv2.FaceDetectorYN.create(
        YU_NET_MODEL_PATH,
        "",
        (320, 320),
        DETECTION_SCORE_THRESHOLD,
        NMS_THRESHOLD,
        TOP_K
    )

    print("YuNet face detector loaded.")

    return detector


def create_face_recognizer():
    if not os.path.exists(SFACE_MODEL_PATH):
        raise FileNotFoundError(
            "SFace face recognition model not found: "
            f"{SFACE_MODEL_PATH}"
        )

    print("Loading SFace face recognizer...")

    recognizer = cv2.FaceRecognizerSF.create(
        SFACE_MODEL_PATH,
        ""
    )

    print("SFace face recognizer loaded.")

    return recognizer


# ============================================================
# LOAD API MODELS
# ============================================================

try:
    api_detector = create_detector()
    api_recognizer = create_face_recognizer()

    print()
    print("FACE MODELS LOADED SUCCESSFULLY")
    print()

except Exception as error:
    print()
    print("WARNING: Could not load face models.")
    print(
        type(error).__name__,
        ":",
        error
    )

    api_detector = None
    api_recognizer = None


# ============================================================
# IMAGE QUALITY FUNCTIONS
# ============================================================

def calculate_blur_score(face_image):
    gray = cv2.cvtColor(
        face_image,
        cv2.COLOR_BGR2GRAY
    )

    score = cv2.Laplacian(
        gray,
        cv2.CV_64F
    ).var()

    return float(score)


def calculate_brightness(face_image):
    gray = cv2.cvtColor(
        face_image,
        cv2.COLOR_BGR2GRAY
    )

    brightness = gray.mean()

    return float(brightness)


def validate_face_quality(
    frame,
    face,
    frame_width,
    frame_height
):
    x, y, w, h = face[:4]

    x = int(x)
    y = int(y)
    w = int(w)
    h = int(h)

    # Face size
    if (
        w < MIN_FACE_WIDTH
        or h < MIN_FACE_HEIGHT
    ):
        return (
            False,
            "Face too far - move closer"
        )

    # Edge margin
    if (
        x < EDGE_MARGIN
        or y < EDGE_MARGIN
        or x + w > frame_width - EDGE_MARGIN
        or y + h > frame_height - EDGE_MARGIN
    ):
        return (
            False,
            "Move face toward the center"
        )

    face_image = frame[
        y:y + h,
        x:x + w
    ]

    if face_image.size == 0:
        return (
            False,
            "Invalid face region"
        )

    # Brightness
    brightness = calculate_brightness(
        face_image
    )

    if brightness < MIN_BRIGHTNESS:
        return (
            False,
            "Too dark - improve lighting"
        )

    if brightness > MAX_BRIGHTNESS:
        return (
            False,
            "Too bright - reduce lighting"
        )

    # Blur
    blur_score = calculate_blur_score(
        face_image
    )

    if blur_score < BLUR_THRESHOLD:
        return (
            False,
            "Image blurry - keep still"
        )

    return (
        True,
        {
            "faceWidth": w,
            "faceHeight": h,
            "brightness": round(
                brightness,
                2
            ),
            "blurScore": round(
                blur_score,
                2
            )
        }
    )


def draw_status(
    frame,
    message,
    color
):
    cv2.putText(
        frame,
        message,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        color,
        2
    )


# ============================================================
# FACE EMBEDDING
# ============================================================

def generate_embedding(
    frame,
    face,
    recognizer
):
    try:
        aligned_face = recognizer.alignCrop(
            frame,
            face
        )

        if (
            aligned_face is None
            or aligned_face.size == 0
        ):
            return None

        embedding = recognizer.feature(
            aligned_face
        )

        if (
            embedding is None
            or embedding.size == 0
        ):
            return None

        embedding = np.asarray(
            embedding,
            dtype=np.float32
        )

        if embedding.size != 128:
            return None

        if not np.all(
            np.isfinite(embedding)
        ):
            return None

        norm = np.linalg.norm(
            embedding
        )

        if norm <= 0:
            return None

        embedding = embedding / norm

        return embedding

    except Exception as error:
        print()
        print("EMBEDDING GENERATION ERROR")
        print(
            type(error).__name__,
            ":",
            error
        )

        return None


# ============================================================
# EMBEDDING CONSISTENCY
# ============================================================

def check_embedding_consistency(
    embeddings,
    recognizer
):
    if len(embeddings) < 2:
        return (
            True,
            1.0
        )

    similarities = []

    for i in range(
        len(embeddings)
    ):
        for j in range(
            i + 1,
            len(embeddings)
        ):
            similarity = recognizer.match(
                embeddings[i],
                embeddings[j],
                cv2.FaceRecognizerSF_FR_COSINE
            )

            similarity = float(
                similarity
            )

            similarities.append(
                similarity
            )

    if not similarities:
        return (
            False,
            0.0
        )

    average_similarity = (
        sum(similarities)
        /
        len(similarities)
    )

    minimum_similarity = min(
        similarities
    )

    print()
    print(
        "BIOMETRIC CONSISTENCY CHECK"
    )

    print(
        f"Total comparisons: "
        f"{len(similarities)}"
    )

    print(
        f"Average cosine similarity: "
        f"{average_similarity:.4f}"
    )

    print(
        f"Minimum cosine similarity: "
        f"{minimum_similarity:.4f}"
    )

    print(
        f"Required threshold: "
        f"{CONSISTENCY_THRESHOLD:.2f}"
    )

    passed = (
        minimum_similarity
        >= CONSISTENCY_THRESHOLD
    )

    return (
        passed,
        minimum_similarity
    )


# ============================================================
# REPRESENTATIVE EMBEDDING
# ============================================================

def create_representative_embedding(
    embeddings
):
    if not embeddings:
        return None

    normalized_embeddings = []

    for embedding in embeddings:
        embedding = (
            embedding
            .astype("float32")
            .reshape(-1)
        )

        norm = np.linalg.norm(
            embedding
        )

        if norm == 0:
            continue

        normalized_embedding = (
            embedding / norm
        )

        normalized_embeddings.append(
            normalized_embedding
        )

    if not normalized_embeddings:
        return None

    representative = np.mean(
        normalized_embeddings,
        axis=0
    )

    norm = np.linalg.norm(
        representative
    )

    if norm == 0:
        return None

    representative = (
        representative / norm
    )

    return representative.astype(
        "float32"
    )


def embedding_to_list(
    embedding
):
    if embedding is None:
        return None

    flattened = (
        embedding.reshape(-1)
    )

    return [
        float(value)
        for value in flattened
    ]


# ============================================================
# DATABASE COMMUNICATION
# ============================================================

def save_face_to_database(
    enrollment_number,
    embedding
):
    if embedding is None:
        return False

    embedding_list = (
        embedding_to_list(
            embedding
        )
    )

    if (
        embedding_list is None
        or len(embedding_list) != 128
    ):
        return False

    payload = {
        "enrollmentNumber": enrollment_number,
        "embedding": embedding_list
    }

    try:
        response = requests.post(
            FACE_REGISTRATION_ENDPOINT,
            json=payload,
            timeout=10
        )

        try:
            result = response.json()

        except ValueError:
            print(
                "DATABASE ERROR: "
                "Backend returned invalid JSON."
            )

            return False

        if (
            response.status_code == 200
            and result.get("success") is True
        ):
            return True

        print()
        print(
            "DATABASE REGISTRATION FAILED"
        )

        print(
            "HTTP status:",
            response.status_code
        )

        print(
            "Backend response:",
            result
        )

        return False

    except Exception as error:
        print(
            "DATABASE COMMUNICATION ERROR:",
            type(error).__name__,
            ":",
            error
        )

        return False


# ============================================================
# REGISTRATION INPUT
# ============================================================

def get_enrollment_number():
    print()
    print(
        "STUDENT FACE REGISTRATION"
    )
    print()

    enrollment_number = input(
        "Enter student enrollment number: "
    ).strip()

    if not enrollment_number:
        return None

    return enrollment_number.upper()


# ============================================================
# BASE64 IMAGE DECODING
# ============================================================

def decode_base64_image(
    image_data
):
    try:
        if not image_data:
            raise ValueError(
                "Image data is empty"
            )

        if "," in image_data:
            image_data = (
                image_data.split(
                    ",",
                    1
                )[1]
            )

        image_bytes = base64.b64decode(
            image_data,
            validate=True
        )

        image_array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if image is None:
            raise ValueError(
                "Unable to decode image"
            )

        return image

    except Exception as error:
        raise ValueError(
            f"Invalid image data: {error}"
        )


# ============================================================
# REGISTERED EMBEDDING VALIDATION
# ============================================================

def normalize_registered_embedding(
    embedding
):
    if not isinstance(
        embedding,
        list
    ):
        raise ValueError(
            "Registered embedding must be a list"
        )

    if len(embedding) != 128:
        raise ValueError(
            "Registered embedding must contain exactly 128 values"
        )

    registered = np.asarray(
        embedding,
        dtype=np.float32
    )

    if not np.all(
        np.isfinite(registered)
    ):
        raise ValueError(
            "Registered embedding contains invalid values"
        )

    norm = np.linalg.norm(
        registered
    )

    if norm <= 0:
        raise ValueError(
            "Registered embedding has zero norm"
        )

    registered = (
        registered / norm
    )

    return registered


# ============================================================
# COSINE SIMILARITY
# ============================================================

def calculate_cosine_similarity(
    embedding1,
    embedding2
):
    embedding1 = (
        embedding1
        .reshape(-1)
    )

    embedding2 = (
        embedding2
        .reshape(-1)
    )

    norm1 = np.linalg.norm(
        embedding1
    )

    norm2 = np.linalg.norm(
        embedding2
    )

    if norm1 <= 0 or norm2 <= 0:
        return 0.0

    embedding1 = (
        embedding1 / norm1
    )

    embedding2 = (
        embedding2 / norm2
    )

    similarity = float(
        np.dot(
            embedding1,
            embedding2
        )
    )

    similarity = max(
        -1.0,
        min(
            1.0,
            similarity
        )
    )

    return similarity


# ============================================================
# SINGLE FACE DETECTION
# ============================================================

def detect_single_face(
    image
):
    if api_detector is None:
        raise RuntimeError(
            "Face detection model is not loaded"
        )

    image_height, image_width = (
        image.shape[:2]
    )

    api_detector.setInputSize(
        (
            image_width,
            image_height
        )
    )

    _, faces = api_detector.detect(
        image
    )

    if faces is None:
        return (
            None,
            0,
            image_width,
            image_height
        )

    face_count = len(faces)

    if face_count != 1:
        return (
            None,
            face_count,
            image_width,
            image_height
        )

    return (
        faces[0],
        1,
        image_width,
        image_height
    )


# ============================================================
# HEAD POSITION / LIVENESS
# ============================================================

def calculate_head_position(
    face
):
    x, y, w, h = face[:4]

    x = float(x)
    y = float(y)
    w = float(w)
    h = float(h)

    if w <= 0 or h <= 0:
        return {
            "position": "unknown",
            "normalizedNoseX": None,
            "normalizedNoseY": None
        }

    nose_x = float(
        face[8]
    )

    nose_y = float(
        face[9]
    )

    normalized_nose_x = (
        nose_x - x
    ) / w

    normalized_nose_y = (
        nose_y - y
    ) / h

    normalized_nose_x = max(
        0.0,
        min(
            1.0,
            normalized_nose_x
        )
    )

    normalized_nose_y = max(
        0.0,
        min(
            1.0,
            normalized_nose_y
        )
    )

    if (
        normalized_nose_x
        < LIVENESS_LEFT_THRESHOLD
    ):
        position = "left"

    elif (
        normalized_nose_x
        > LIVENESS_RIGHT_THRESHOLD
    ):
        position = "right"

    elif (
        LIVENESS_CENTER_MIN
        <= normalized_nose_x
        <= LIVENESS_CENTER_MAX
    ):
        position = "center"

    else:
        position = "transition"

    return {
        "position": position,
        "normalizedNoseX": round(
            normalized_nose_x,
            4
        ),
        "normalizedNoseY": round(
            normalized_nose_y,
            4
        )
    }


# ============================================================
# HEALTH ENDPOINT
# ============================================================

@app.route(
    "/health",
    methods=["GET", "OPTIONS"]
)
def health():
    models_loaded = (
        api_detector is not None
        and api_recognizer is not None
    )

    return jsonify({
        "success": True,
        "service": "Attendify Face Service",
        "status": (
            "healthy"
            if models_loaded
            else "degraded"
        ),
        "opencvVersion": cv2.__version__,
        "modelsLoaded": models_loaded,
        "detectorThreshold":
            DETECTION_SCORE_THRESHOLD,
        "livenessEnabled": True
    }), 200


# ============================================================
# LIVENESS ENDPOINT
# ============================================================

@app.route(
    "/check-liveness",
    methods=["POST", "OPTIONS"]
)
def check_liveness():
    if request.method == "OPTIONS":
        response = make_response("", 204)

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )

        return response

    request_start_time = time.time()

    try:
        if api_detector is None:
            return jsonify({
                "success": False,
                "livenessPassed": False,
                "message":
                    "Face detection model is not loaded",
                "reason":
                    "MODELS_NOT_LOADED"
            }), 503

        data = request.get_json(
            silent=True
        )

        if not data:
            return jsonify({
                "success": False,
                "livenessPassed": False,
                "message":
                    "JSON request body is required",
                "reason":
                    "NO_JSON_BODY"
            }), 400

        image_data = data.get(
            "image"
        )

        challenge = (
            str(
                data.get(
                    "challenge",
                    "center"
                )
            )
            .strip()
            .lower()
        )

        if not image_data:
            return jsonify({
                "success": False,
                "livenessPassed": False,
                "message":
                    "Image is required",
                "reason":
                    "IMAGE_REQUIRED"
            }), 400

        allowed_challenges = {
            "left",
            "right",
            "center"
        }

        if challenge not in allowed_challenges:
            return jsonify({
                "success": False,
                "livenessPassed": False,
                "message":
                    "Invalid liveness challenge",
                "reason":
                    "INVALID_CHALLENGE"
            }), 400

        image = decode_base64_image(
            image_data
        )

        (
            face,
            face_count,
            image_width,
            image_height
        ) = detect_single_face(
            image
        )

        if face_count == 0:
            return jsonify({
                "success": True,
                "livenessPassed": False,
                "challenge": challenge,
                "message":
                    "No face detected",
                "reason":
                    "NO_FACE",
                "faceCount": 0
            }), 200

        if face_count > 1:
            return jsonify({
                "success": True,
                "livenessPassed": False,
                "challenge": challenge,
                "message":
                    "Multiple faces detected. "
                    "Only one person is allowed.",
                "reason":
                    "MULTIPLE_FACES",
                "faceCount": face_count
            }), 200

        x, y, w, h = face[:4]

        if (
            w < LIVENESS_MIN_FACE_SIZE
            or h < LIVENESS_MIN_FACE_SIZE
        ):
            return jsonify({
                "success": True,
                "livenessPassed": False,
                "challenge": challenge,
                "message":
                    "Move closer to the camera",
                "reason":
                    "FACE_TOO_SMALL",
                "faceCount": 1
            }), 200

        quality_ok, quality_result = (
            validate_face_quality(
                image,
                face,
                image_width,
                image_height
            )
        )

        head_position = (
            calculate_head_position(
                face
            )
        )

        current_position = (
            head_position["position"]
        )

        challenge_passed = (
            current_position == challenge
        )

        processing_time = (
            time.time()
            - request_start_time
        )

        if not quality_ok:
            challenge_passed = False

            message = quality_result
            reason = "QUALITY_CHECK_FAILED"

        elif challenge_passed:
            if challenge == "left":
                message = (
                    "Left movement detected"
                )

            elif challenge == "right":
                message = (
                    "Right movement detected"
                )

            else:
                message = (
                    "Center position detected"
                )

            reason = "CHALLENGE_PASSED"

        else:
            if challenge == "left":
                message = (
                    "Turn your head LEFT"
                )

            elif challenge == "right":
                message = (
                    "Turn your head RIGHT"
                )

            else:
                message = (
                    "Return your head to CENTER"
                )

            reason = "CHALLENGE_NOT_PASSED"

        return jsonify({
            "success": True,
            "livenessPassed":
                challenge_passed,
            "challenge":
                challenge,
            "currentPosition":
                current_position,
            "message":
                message,
            "reason":
                reason,
            "faceCount":
                1,
            "headPosition":
                head_position,
            "qualityOk":
                quality_ok,
            "quality":
                (
                    quality_result
                    if isinstance(
                        quality_result,
                        dict
                    )
                    else None
                ),
            "processingTimeSeconds":
                round(
                    processing_time,
                    3
                )
        }), 200

    except ValueError as error:
        return jsonify({
            "success": False,
            "livenessPassed": False,
            "message": str(error),
            "reason":
                "VALIDATION_ERROR"
        }), 400

    except Exception as error:
        print(
            "LIVENESS CHECK ERROR:",
            type(error).__name__,
            ":",
            error
        )

        return jsonify({
            "success": False,
            "livenessPassed": False,
            "message":
                "Liveness check failed",
            "reason":
                "INTERNAL_ERROR"
        }), 500


# ============================================================
# GENERATE SINGLE EMBEDDING
# ============================================================

@app.route(
    "/generate-embedding",
    methods=["POST", "OPTIONS"]
)
def generate_registration_embedding():
    if request.method == "OPTIONS":
        response = make_response("", 204)

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )

        return response

    request_start_time = time.time()

    try:
        if (
            api_detector is None
            or api_recognizer is None
        ):
            return jsonify({
                "success": False,
                "message":
                    "Face recognition models are not loaded",
                "reason":
                    "MODELS_NOT_LOADED"
            }), 503

        data = request.get_json(
            silent=True
        )

        if not data:
            return jsonify({
                "success": False,
                "message":
                    "JSON request body is required",
                "reason":
                    "NO_JSON_BODY"
            }), 400

        image_data = data.get(
            "image"
        )

        if not image_data:
            return jsonify({
                "success": False,
                "message":
                    "Image is required",
                "reason":
                    "IMAGE_REQUIRED"
            }), 400

        image = decode_base64_image(
            image_data
        )

        image_height, image_width = (
            image.shape[:2]
        )

        api_detector.setInputSize(
            (
                image_width,
                image_height
            )
        )

        _, faces = api_detector.detect(
            image
        )

        if faces is None:
            return jsonify({
                "success": False,
                "message":
                    "No face detected",
                "reason":
                    "NO_FACE",
                "faceCount": 0
            }), 200

        face_count = len(faces)

        if face_count > 1:
            return jsonify({
                "success": False,
                "message":
                    "Multiple faces detected. "
                    "Only one person is allowed.",
                "reason":
                    "MULTIPLE_FACES",
                "faceCount":
                    face_count
            }), 200

        face = faces[0]

        detection_score = float(
            face[-1]
        )

        quality_ok, quality_result = (
            validate_face_quality(
                image,
                face,
                image_width,
                image_height
            )
        )

        if not quality_ok:
            return jsonify({
                "success": False,
                "message": quality_result,
                "reason":
                    "QUALITY_CHECK_FAILED",
                "faceCount": 1,
                "detectionScore":
                    round(
                        detection_score,
                        6
                    )
            }), 200

        embedding = (
            generate_embedding(
                image,
                face,
                api_recognizer
            )
        )

        if embedding is None:
            return jsonify({
                "success": False,
                "message":
                    "Could not generate face embedding",
                "reason":
                    "EMBEDDING_FAILED",
                "faceCount": 1
            }), 500

        embedding_list = (
            embedding_to_list(
                embedding
            )
        )

        processing_time = (
            time.time()
            - request_start_time
        )

        return jsonify({
            "success": True,
            "message":
                "Face embedding generated successfully",
            "embedding":
                embedding_list,
            "embeddingDimension":
                len(embedding_list),
            "faceCount":
                1,
            "detectionScore":
                round(
                    detection_score,
                    6
                ),
            "quality":
                quality_result,
            "processingTimeSeconds":
                round(
                    processing_time,
                    3
                )
        }), 200

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error),
            "reason":
                "VALIDATION_ERROR"
        }), 400

    except Exception as error:
        print(
            "GENERATE-EMBEDDING ERROR:",
            type(error).__name__,
            ":",
            error
        )

        return jsonify({
            "success": False,
            "message":
                "Face embedding generation failed",
            "reason":
                "INTERNAL_ERROR"
        }), 500


# ============================================================
# GENERATE REGISTRATION TEMPLATE
# ============================================================

@app.route(
    "/generate-registration-template",
    methods=["POST", "OPTIONS"]
)
def generate_registration_template():
    if request.method == "OPTIONS":
        response = make_response("", 204)

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )

        return response

    request_start_time = time.time()

    try:
        if (
            api_detector is None
            or api_recognizer is None
        ):
            return jsonify({
                "success": False,
                "message":
                    "Face recognition models are not loaded",
                "reason":
                    "MODELS_NOT_LOADED"
            }), 503

        data = request.get_json(
            silent=True
        )

        if not data:
            return jsonify({
                "success": False,
                "message":
                    "JSON request body is required",
                "reason":
                    "NO_JSON_BODY"
            }), 400

        images = data.get(
            "images"
        )

        if not isinstance(
            images,
            list
        ):
            return jsonify({
                "success": False,
                "message":
                    "Images must be provided as an array",
                "reason":
                    "IMAGES_REQUIRED"
            }), 400

        if len(images) != REQUIRED_SAMPLES:
            return jsonify({
                "success": False,
                "message":
                    f"Exactly {REQUIRED_SAMPLES} "
                    "face samples are required",
                "reason":
                    "INVALID_SAMPLE_COUNT",
                "requiredSamples":
                    REQUIRED_SAMPLES,
                "receivedSamples":
                    len(images)
            }), 400

        embeddings = []
        sample_results = []

        for index, image_data in enumerate(
            images,
            start=1
        ):
            if not image_data:
                return jsonify({
                    "success": False,
                    "message":
                        f"Sample {index} is empty",
                    "reason":
                        "IMAGE_REQUIRED",
                    "sample":
                        index
                }), 400

            image = decode_base64_image(
                image_data
            )

            image_height, image_width = (
                image.shape[:2]
            )

            api_detector.setInputSize(
                (
                    image_width,
                    image_height
                )
            )

            _, faces = api_detector.detect(
                image
            )

            if faces is None:
                return jsonify({
                    "success": False,
                    "message":
                        f"No face detected in sample {index}",
                    "reason":
                        "NO_FACE",
                    "sample":
                        index
                }), 200

            face_count = len(faces)

            if face_count != 1:
                return jsonify({
                    "success": False,
                    "message":
                        f"Sample {index} must contain exactly one face",
                    "reason":
                        "INVALID_FACE_COUNT",
                    "sample":
                        index,
                    "faceCount":
                        face_count
                }), 200

            face = faces[0]

            detection_score = float(
                face[-1]
            )

            quality_ok, quality_result = (
                validate_face_quality(
                    image,
                    face,
                    image_width,
                    image_height
                )
            )

            if not quality_ok:
                return jsonify({
                    "success": False,
                    "message":
                        f"Sample {index}: "
                        f"{quality_result}",
                    "reason":
                        "QUALITY_CHECK_FAILED",
                    "sample":
                        index,
                    "faceCount":
                        1,
                    "detectionScore":
                        round(
                            detection_score,
                            6
                        )
                }), 200

            embedding = (
                generate_embedding(
                    image,
                    face,
                    api_recognizer
                )
            )

            if embedding is None:
                return jsonify({
                    "success": False,
                    "message":
                        f"Could not generate embedding "
                        f"for sample {index}",
                    "reason":
                        "EMBEDDING_FAILED",
                    "sample":
                        index
                }), 500

            embeddings.append(
                embedding
            )

            sample_results.append({
                "sample":
                    index,
                "faceCount":
                    1,
                "detectionScore":
                    round(
                        detection_score,
                        6
                    ),
                "quality":
                    quality_result
            })

        (
            consistency_passed,
            minimum_similarity
        ) = check_embedding_consistency(
            embeddings,
            api_recognizer
        )

        if not consistency_passed:
            return jsonify({
                "success": False,
                "message":
                    "Face samples are not sufficiently "
                    "consistent. Please recapture the face "
                    "with a consistent position and lighting.",
                "reason":
                    "CONSISTENCY_CHECK_FAILED",
                "requiredSamples":
                    REQUIRED_SAMPLES,
                "samplesProcessed":
                    len(embeddings),
                "minimumSimilarity":
                    round(
                        minimum_similarity,
                        6
                    ),
                "consistencyThreshold":
                    CONSISTENCY_THRESHOLD,
                "samples":
                    sample_results
            }), 200

        representative_embedding = (
            create_representative_embedding(
                embeddings
            )
        )

        if representative_embedding is None:
            return jsonify({
                "success": False,
                "message":
                    "Could not create representative face template",
                "reason":
                    "REPRESENTATIVE_EMBEDDING_FAILED"
            }), 500

        representative_list = (
            embedding_to_list(
                representative_embedding
            )
        )

        processing_time = (
            time.time()
            - request_start_time
        )

        return jsonify({
            "success": True,
            "message":
                "Face registration template "
                "generated successfully",
            "embedding":
                representative_list,
            "embeddingDimension":
                len(representative_list),
            "samplesRequired":
                REQUIRED_SAMPLES,
            "samplesProcessed":
                len(embeddings),
            "consistencyPassed":
                True,
            "minimumSimilarity":
                round(
                    minimum_similarity,
                    6
                ),
            "consistencyThreshold":
                CONSISTENCY_THRESHOLD,
            "samples":
                sample_results,
            "processingTimeSeconds":
                round(
                    processing_time,
                    3
                )
        }), 200

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error),
            "reason":
                "VALIDATION_ERROR"
        }), 400

    except Exception as error:
        print(
            "REGISTRATION TEMPLATE ERROR:",
            type(error).__name__,
            ":",
            error
        )

        return jsonify({
            "success": False,
            "message":
                "Face registration template generation failed",
            "reason":
                "INTERNAL_ERROR"
        }), 500


# ============================================================
# FACE VERIFICATION
# ============================================================

@app.route(
    "/verify-face",
    methods=["POST", "OPTIONS"]
)
def verify_face():
    if request.method == "OPTIONS":
        response = make_response("", 204)

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, OPTIONS"
        )
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization"
        )

        return response

    request_start_time = time.time()

    try:
        if (
            api_detector is None
            or api_recognizer is None
        ):
            return jsonify({
                "success": False,
                "verified": False,
                "message":
                    "Face recognition models are not loaded"
            }), 503

        data = request.get_json(
            silent=True
        )

        if not data:
            return jsonify({
                "success": False,
                "verified": False,
                "message":
                    "JSON request body is required"
            }), 400

        image_data = data.get(
            "image"
        )

        registered_embedding = (
            data.get(
                "registeredEmbedding"
            )
        )

        if not image_data:
            return jsonify({
                "success": False,
                "verified": False,
                "message":
                    "Image is required"
            }), 400

        if registered_embedding is None:
            return jsonify({
                "success": False,
                "verified": False,
                "message":
                    "Registered embedding is required"
            }), 400

        registered = (
            normalize_registered_embedding(
                registered_embedding
            )
        )

        image = decode_base64_image(
            image_data
        )

        image_height, image_width = (
            image.shape[:2]
        )

        api_detector.setInputSize(
            (
                image_width,
                image_height
            )
        )

        _, faces = api_detector.detect(
            image
        )

        if faces is None:
            return jsonify({
                "success": True,
                "verified": False,
                "message":
                    "No face detected",
                "reason":
                    "NO_FACE",
                "faceCount": 0
            }), 200

        face_count = len(faces)

        if face_count > 1:
            return jsonify({
                "success": True,
                "verified": False,
                "message":
                    "Multiple faces detected. "
                    "Only one person is allowed.",
                "reason":
                    "MULTIPLE_FACES",
                "faceCount":
                    face_count
            }), 200

        face = faces[0]

        detection_score = float(
            face[-1]
        )

        quality_ok, quality_result = (
            validate_face_quality(
                image,
                face,
                image_width,
                image_height
            )
        )

        if not quality_ok:
            return jsonify({
                "success": True,
                "verified": False,
                "message":
                    quality_result,
                "reason":
                    "QUALITY_CHECK_FAILED",
                "faceCount":
                    1,
                "detectionScore":
                    round(
                        detection_score,
                        6
                    )
            }), 200

        live_embedding = (
            generate_embedding(
                image,
                face,
                api_recognizer
            )
        )

        if live_embedding is None:
            return jsonify({
                "success": False,
                "verified": False,
                "message":
                    "Could not generate face embedding",
                "reason":
                    "EMBEDDING_FAILED"
            }), 500

        similarity = (
            calculate_cosine_similarity(
                live_embedding,
                registered
            )
        )

        processing_time = (
            time.time()
            - request_start_time
        )

        return jsonify({
            "success": True,

            # IMPORTANT:
            # This means the face comparison was completed.
            # It does NOT itself apply a similarity threshold.
            "verified": True,

            "similarity":
                round(
                    similarity,
                    6
                ),

            "faceCount":
                1,

            "detectionScore":
                round(
                    detection_score,
                    6
                ),

            "quality":
                quality_result,

            "processingTimeSeconds":
                round(
                    processing_time,
                    3
                )
        }), 200

    except ValueError as error:
        return jsonify({
            "success": False,
            "verified": False,
            "message": str(error),
            "reason":
                "VALIDATION_ERROR"
        }), 400

    except Exception as error:
        print(
            "FACE VERIFICATION ERROR:",
            type(error).__name__,
            ":",
            error
        )

        return jsonify({
            "success": False,
            "verified": False,
            "message":
                "Face verification failed",
            "reason":
                "INTERNAL_ERROR"
        }), 500


# ============================================================
# LOCAL CAMERA REGISTRATION
# ============================================================

def run_registration():
    print()
    print(
        "SECURE FACE REGISTRATION"
    )
    print()

    enrollment_number = (
        get_enrollment_number()
    )

    if not enrollment_number:
        print(
            "Invalid enrollment number."
        )
        return

    try:
        detector = create_detector()

    except Exception as error:
        print(
            "ERROR loading YuNet:",
            error
        )
        return

    try:
        recognizer = create_face_recognizer()

    except Exception as error:
        print(
            "ERROR loading SFace:",
            error
        )
        return

    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        print(
            "ERROR: Could not access webcam."
        )
        return

    print()
    print(
        "Registration requirements:"
    )
    print(
        "- Exactly one face"
    )
    print(
        "- Face clearly visible"
    )
    print(
        "- Good lighting"
    )
    print(
        "- Keep face steady"
    )
    print(
        "- Keep face near center"
    )
    print(
        f"- {REQUIRED_SAMPLES} samples required"
    )
    print()
    print(
        "SPACE = Capture"
    )
    print(
        "Q = Quit"
    )
    print()

    embeddings = []
    last_sample_time = 0
    registration_success = False

    while True:
        success, frame = (
            camera.read()
        )

        if not success:
            print(
                "ERROR: Could not read camera frame."
            )
            break

        frame = cv2.flip(
            frame,
            1
        )

        frame_height, frame_width = (
            frame.shape[:2]
        )

        detector.setInputSize(
            (
                frame_width,
                frame_height
            )
        )

        _, faces = detector.detect(
            frame
        )

        face_count = (
            0
            if faces is None
            else len(faces)
        )

        status = ""
        status_color = (
            0,
            0,
            255
        )

        quality_ok = False

        if faces is not None:
            for face in faces:
                x, y, w, h = face[:4]

                x = int(x)
                y = int(y)
                w = int(w)
                h = int(h)

                detection_confidence = float(
                    face[-1]
                )

                cv2.rectangle(
                    frame,
                    (x, y),
                    (x + w, y + h),
                    (0, 255, 0),
                    2
                )

                cv2.putText(
                    frame,
                    (
                        f"Detection: "
                        f"{detection_confidence:.2f}"
                    ),
                    (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (0, 255, 0),
                    2
                )

                if face_count == 1:
                    (
                        quality_ok,
                        quality_message
                    ) = validate_face_quality(
                        frame,
                        face,
                        frame_width,
                        frame_height
                    )

                    if isinstance(
                        quality_message,
                        dict
                    ):
                        status = (
                            "Face quality good"
                        )

                    else:
                        status = (
                            quality_message
                        )

                    if quality_ok:
                        status_color = (
                            0,
                            255,
                            0
                        )

        if face_count == 0:
            status = (
                "NO FACE - Look at camera"
            )

            status_color = (
                0,
                0,
                255
            )

            quality_ok = False

        elif face_count > 1:
            status = (
                "MULTIPLE FACES - "
                "Only one allowed"
            )

            status_color = (
                0,
                0,
                255
            )

            quality_ok = False

        draw_status(
            frame,
            status,
            status_color
        )

        progress_text = (
            f"Samples: "
            f"{len(embeddings)}/"
            f"{REQUIRED_SAMPLES}"
        )

        cv2.putText(
            frame,
            progress_text,
            (20, frame_height - 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            "SPACE = Capture | Q = Quit",
            (20, frame_height - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2
        )

        cv2.imshow(
            WINDOW_NAME,
            frame
        )

        key = (
            cv2.waitKey(1)
            & 0xFF
        )

        if key == ord("q"):
            print()
            print(
                "Registration cancelled."
            )
            break

        if key == 32:
            current_time = time.time()

            if (
                current_time
                - last_sample_time
                < SAMPLE_DELAY
            ):
                print(
                    "Please wait before "
                    "capturing another sample."
                )
                continue

            last_sample_time = current_time

            if face_count == 0:
                print(
                    "REJECTED: No face detected."
                )
                continue

            if face_count > 1:
                print(
                    "REJECTED: Multiple faces detected."
                )
                continue

            if not quality_ok:
                print(
                    f"REJECTED: {status}"
                )
                continue

            face = faces[0]

            embedding = (
                generate_embedding(
                    frame,
                    face,
                    recognizer
                )
            )

            if embedding is None:
                print(
                    "REJECTED: "
                    "Embedding generation failed."
                )
                continue

            embeddings.append(
                embedding.copy()
            )

            print(
                f"Sample "
                f"{len(embeddings)}/"
                f"{REQUIRED_SAMPLES} "
                f"captured successfully."
            )

            if (
                len(embeddings)
                >= REQUIRED_SAMPLES
            ):
                (
                    consistency_passed,
                    similarity
                ) = check_embedding_consistency(
                    embeddings,
                    recognizer
                )

                if consistency_passed:
                    representative_embedding = (
                        create_representative_embedding(
                            embeddings
                        )
                    )

                    if (
                        representative_embedding
                        is None
                    ):
                        print(
                            "ERROR: Could not create "
                            "representative embedding."
                        )
                        break

                    database_saved = (
                        save_face_to_database(
                            enrollment_number,
                            representative_embedding
                        )
                    )

                    if database_saved:
                        registration_success = True

                        print()
                        print(
                            "FACE REGISTRATION COMPLETE"
                        )

                    else:
                        registration_success = False

                        print()
                        print(
                            "FACE REGISTRATION FAILED"
                        )

                else:
                    registration_success = False

                    print()
                    print(
                        "FACE REGISTRATION REJECTED"
                    )

                    print(
                        "The biometric samples were "
                        "not sufficiently consistent."
                    )

                break

    camera.release()

    cv2.destroyAllWindows()

    print()

    if registration_success:
        print(
            "REGISTRATION SUCCESSFUL"
        )

        print(
            "Student:",
            enrollment_number
        )

        print(
            "Biometric template saved to MongoDB."
        )

    else:
        print(
            "Face registration was not completed."
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print()
    print(
        "ATTENDIFY FACE SERVICE"
    )
    print()

    print(
        "1. Run face registration"
    )

    print(
        "2. Run verification API"
    )

    print()

    choice = input(
        "Choose an option (1/2): "
    ).strip()

    if choice == "1":
        run_registration()

    elif choice == "2":
        print()
        print(
            "Starting Attendify Face Verification API..."
        )

        print(
            f"http://{FACE_SERVICE_HOST}:"
            f"{FACE_SERVICE_PORT}"
        )

        print()

        app.run(
            host=FACE_SERVICE_HOST,
            port=FACE_SERVICE_PORT,
            debug=False,
            use_reloader=False
        )

    else:
        print(
            "Invalid option."
        )

