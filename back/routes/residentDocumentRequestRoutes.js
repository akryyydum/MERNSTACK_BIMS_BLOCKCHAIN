const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const { createRequest, list, getStats, getById, checkPaymentStatus } = require("../controllers/residentDocumentRequestController");

// Protect all routes for residents and officials (officials can act on their own behalf)
router.use(auth, authorize("resident", "official"));

// List all document requests for the current resident
router.get("/", list);

// Get document request statistics
router.get("/stats", getStats);

// Check payment status before allowing document requests
router.get("/payment-status", checkPaymentStatus);

// Get a specific document request by ID
router.get("/:id", getById);

// Create a new document request
router.post("/", createRequest);

module.exports = router;
