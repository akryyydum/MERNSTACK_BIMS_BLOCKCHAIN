const express = require("express");
const router = express.Router();
const {
  listPublic,
  download,
  preview,
} = require("../controllers/adminPublicDocumentsController");
const { auth, authorizeRoles } = require("../middleware/authMiddleware");

// Allow both residents and officials to view public documents
router.get("/", auth, authorizeRoles("resident", "official"), listPublic);
router.get("/:id/download", auth, authorizeRoles("resident", "official"), download);
router.get("/:id/preview", auth, authorizeRoles("resident", "official"), preview);

module.exports = router;