const dns = require("./src/dns");
require("dotenv").config({ path: "./.env" });

const mongoose = require("mongoose");

async function checkMongo() {
try {
await mongoose.connect(process.env.MONGO_URI);

console.log("\nConnected to MongoDB");
console.log("Host:", mongoose.connection.host);
console.log("Database:", mongoose.connection.name);

const databases = await mongoose.connection.db.admin().listDatabases();

console.log("\nDATABASES:");
for (const database of databases.databases) {
  console.log("-", database.name);
}

const collections =
  await mongoose.connection.db.listCollections().toArray();

console.log("\nCOLLECTIONS IN CURRENT DATABASE:");

for (const collection of collections) {
  console.log("-", collection.name);
}

console.log("\nDOCUMENT COUNTS:");

for (const collection of collections) {
  const count =
    await mongoose.connection.db
      .collection(collection.name)
      .countDocuments();

  console.log(`${collection.name}: ${count}`);
}

await mongoose.disconnect();

console.log("\nInspection completed.");

} catch (error) {
console.error("\nMongoDB inspection failed:");
console.error(error.message);
process.exit(1);
}
}

checkMongo();