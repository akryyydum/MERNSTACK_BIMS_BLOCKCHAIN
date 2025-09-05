const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminDocumentRequestCtrl = require("../controllers/adminDocumentRequestController");

// Protect all routes
router.use(auth, authorize("admin"));

// List all document requests
router.get("/", adminDocumentRequestCtrl.list);

// Approve a document request
router.patch("/:id/approve", adminDocumentRequestCtrl.approve);

// Deny a document request
router.patch("/:id/deny", adminDocumentRequestCtrl.deny);

// Delete a document request
router.delete("/:id", adminDocumentRequestCtrl.delete);

module.exports = router;