
const AdminActivityLog = require("../models/AdminActivityLog");

// ==========================================
// GET ADMIN ACTIVITY LOGS
// ==========================================

const getAdminActivityLogs = async (req, res) => {
  try {
    // Pagination parameters
    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const offset = (page - 1) * limit;

    // Optional action filter
    const where = {};

    if (
      typeof req.query.action === "string" &&
      req.query.action.trim() !== ""
    ) {
      where.action = req.query.action.trim();
    }

    const result = await AdminActivityLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(
      result.count / limit
    );

    return res.status(200).json({
      success: true,
      message: "Activity logs retrieved successfully",
      data: result.rows,
      pagination: {
        totalRecords: result.count,
        currentPage: page,
        totalPages,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error(
      "Get admin activity logs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve activity logs",
    });
  }
};

module.exports = {
  getAdminActivityLogs,
};
