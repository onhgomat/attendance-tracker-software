const { verifyFace } = require("./src/services/faceService");

const test = async () => {
try {
console.log("Testing Node -> Python Face Service...");

const result = await verifyFace(
  "invalid-test-image",
  Array(128).fill(0.01)
);

console.log("Face Service Response:");
console.log(result);

} catch (error) {
console.error("Face Service Test Failed:");
console.error(error.message);
}
};

test();