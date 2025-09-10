const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const {
  list,
  approve,
  deny,
  delete: deleteRequest,
  create,
  acceptRequest,
  declineRequest,
  completeRequest,
} = require("../controllers/adminDocumentRequestController");

// Protect all routes
router.use(auth, authorize("admin"));

// List all document requests
router.get("/", list);

// Approve a document request
router.patch("/:id/approve", approve);

// Deny a document request
router.patch("/:id/deny", deny);

// Delete a document request
router.delete("/:id", deleteRequest);

// Create a new document request
router.post("/", create);

// Accept a document request
router.patch("/:id/accept", acceptRequest);

// Decline a document request
router.patch("/:id/decline", declineRequest);

// Complete a document request
router.patch("/:id/complete", completeRequest);

module.exports = router;