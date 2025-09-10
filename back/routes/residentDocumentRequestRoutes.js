const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const { createRequest, list, getStats, getById } = require("../controllers/residentDocumentRequestController");

// Protect all routes for residents only
router.use(auth, authorize("resident"));

// List all document requests for the current resident
router.get("/", list);

// Get document request statistics
router.get("/stats", getStats);

// Get a specific document request by ID
router.get("/:id", getById);

// Create a new document request
router.post("/", createRequest);

module.exports = router;
