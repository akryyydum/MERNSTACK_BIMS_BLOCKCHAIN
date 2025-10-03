const express = require("express");
const router = express.Router();
const {
  listPublic,
  download,
  preview,
} = require("../controllers/adminPublicDocumentsController");
const { auth, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/", auth, authorizeRoles("resident"), listPublic);
router.get("/:id/download", auth, authorizeRoles("resident"), download);
router.get("/:id/preview", auth, authorizeRoles("resident"), preview);

module.exports = router;