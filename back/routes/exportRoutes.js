const express = require("express");
const router = express.Router();
const { exportSummaryCSV } = require("../controllers/exportController");
const { auth, authorize } = require("../middleware/authMiddleware");

/**
 * @route   GET /api/export/summary-csv
 * @desc    Export comprehensive summary as CSV with date range filter
 * @access  Admin only
 * @query   type - Filter type: 'day' | 'week' | 'month' | 'year'
 * @query   date - ISO date string for the selected period
 */
router.get("/summary-csv", auth, authorize("admin"), exportSummaryCSV);

module.exports = router;
