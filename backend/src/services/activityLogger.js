
const AdminActivityLog = require("../models/AdminActivityLog");

const logActivity = async ({
  req,
  adminId = null,
  action,
  entityType = null,
  entityId = null,
  details = null
}) => {
  try {
    await AdminActivityLog.create({
      adminId: adminId ? String(adminId) : null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      details,
      ipAddress: req?.ip || null,
      userAgent: req?.get("user-agent") || null
    });

    console.log(`MySQL activity logged: ${action}`);
  } catch (error) {
    // Logging failure must not break existing MongoDB operations
    console.error("Activity logging failed:", error.message);
  }
};

module.exports = logActivity;
