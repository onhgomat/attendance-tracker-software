const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
      minlength: [2, "Admin name must contain at least 2 characters"],
      maxlength: [100, "Admin name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Admin email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [150, "Email cannot exceed 150 characters"],
    },

    password: {
      type: String,
      required: [true, "Admin password is required"],
      minlength: [8, "Password must contain at least 8 characters"],
    },

    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;