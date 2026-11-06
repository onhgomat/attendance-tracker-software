const axios = require("axios");

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000";

const verifyFace = async (imageBase64, registeredEmbedding) => {
if (!imageBase64) {
throw new Error("Face image is required");
}

if (!Array.isArray(registeredEmbedding) || registeredEmbedding.length !== 128) {
throw new Error("Invalid registered face embedding");
}

try {
const url = FACE_SERVICE_URL + "/verify-face";

const response = await axios.post(
  url,
  {
    image: imageBase64,
    registeredEmbedding: registeredEmbedding
  },
  {
    timeout: 15000,
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024
  }
);

return response.data;

} catch (error) {
if (error.response) {
throw new Error(
error.response.data?.message ||
"Face verification service returned an error"
);
}

if (error.code === "ECONNREFUSED") {
  throw new Error("Face verification service is not running");
}

if (error.code === "ETIMEDOUT") {
  throw new Error("Face verification service timed out");
}

throw new Error(
  "Face verification service failed: " + error.message
);

}
};

module.exports = {
verifyFace
};