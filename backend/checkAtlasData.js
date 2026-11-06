require("./src/dns");
require("dotenv").config({ path: "./.env" });

const mongoose = require("mongoose");

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("\n=================================");
        console.log("MONGODB DATA CHECK");
        console.log("=================================\n");

        console.log("Database:", mongoose.connection.name);
        console.log("Host:", mongoose.connection.host);

        const db = mongoose.connection.db;

        const collections = await db.listCollections().toArray();

        console.log("\nCollections:");
        collections.forEach(c => {
            console.log(" -", c.name);
        });

        console.log("\n=================================");
        console.log("DOCUMENT COUNTS");
        console.log("=================================\n");

        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            console.log(`${collection.name}: ${count}`);
        }

        console.log("\n=================================");
        console.log("STUDENTS");
        console.log("=================================\n");

        const students = await db
            .collection("students")
            .find({})
            .project({
                name: 1,
                enrollmentNumber: 1,
                faceRegistered: 1,
                faceRegisteredAt: 1
            })
            .sort({ _id: 1 })
            .toArray();

        students.forEach((student, index) => {
            console.log(
                `${index + 1}. ${student.name} | ${student.enrollmentNumber} | faceRegistered=${student.faceRegistered}`
            );
        });

        console.log("\nTotal students:", students.length);
	console.log("\n=================================");
console.log("ADMINS");
console.log("=================================\n");

const admins = await db
    .collection("admins")
    .find({})
    .project({
        name: 1,
        email: 1,
        role: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1
    })
    .toArray();

admins.forEach((admin, index) => {
    console.log(`${index + 1}.`);
    console.log("   Name:", admin.name);
    console.log("   Email:", admin.email);
    console.log("   Role:", admin.role);
    console.log("   Active:", admin.isActive);
    console.log("   Created:", admin.createdAt);
    console.log("   Updated:", admin.updatedAt);
    console.log("");
});

console.log("Total admins:", admins.length);

        await mongoose.disconnect();

        console.log("\n=================================");
        console.log("CHECK COMPLETE");
        console.log("=================================\n");

    } catch (error) {
        console.error("\nMongoDB check failed:");
        console.error(error);
        process.exit(1);
    }
}

check();