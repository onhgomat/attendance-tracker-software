
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/mysql");

const AdminActivityLog = sequelize.define(
  "AdminActivityLog",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true
    },

    adminId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },

    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    entityId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },

    details: {
      type: DataTypes.JSON,
      allowNull: true
    },

    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },

    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  },
  {
    tableName: "admin_activity_logs",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["adminId"] },
      { fields: ["createdAt"] }
    ]
  }
);

module.exports = AdminActivityLog;
