const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const residentDocumentRequestCtrl = require("../controllers/residentDocumentRequestController");

// Protect all routes for residents only
router.use(auth, authorize("resident"));

// List all document requests for the current resident
router.get("/", residentDocumentRequestCtrl.list);

// Get document request statistics
router.get("/stats", residentDocumentRequestCtrl.getStats);

// Get a specific document request by ID
router.get("/:id", residentDocumentRequestCtrl.getById);

// Create a new document request
router.post("/", residentDocumentRequestCtrl.create);

module.exports = router;
