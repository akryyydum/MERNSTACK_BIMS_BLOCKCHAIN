const express = require("express");
const router = express.Router();
const {
  listPublicAnnouncements,
  streamPublicAnnouncementFile
} = require("../controllers/adminPublicDocumentsController");

// Public endpoint used by landing page to surface announcements
router.get("/", listPublicAnnouncements);
router.get("/:id/file", streamPublicAnnouncementFile);

module.exports = router;
