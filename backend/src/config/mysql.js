
const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");

const caPath = path.join(__dirname, "../../certs/ca.pem");

if (!fs.existsSync(caPath)) {
  throw new Error("Aiven CA certificate not found: " + caPath);
}

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    dialect: "mysql",

    dialectOptions: {
      ssl: {
        ca: fs.readFileSync(caPath),
        rejectUnauthorized: true
      }
    },

    logging: false,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectMySQL = async () => {
  try {
    await sequelize.authenticate();
    console.log("Aiven MySQL connected successfully!");
  } catch (error) {
    console.error("Aiven MySQL connection failed:", error.message);
    throw error;
  }
};

module.exports = { sequelize, connectMySQL };
