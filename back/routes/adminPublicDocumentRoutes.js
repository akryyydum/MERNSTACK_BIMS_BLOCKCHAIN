const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const {
  listAdmin,
  create,
  remove,
  download,
  preview,
} = require("../controllers/adminPublicDocumentsController");
const { auth, authorizeRoles } = require("../middleware/authMiddleware");

const uploadDir = path.join(__dirname, "..", "uploads", "publicdocs");
require("fs").mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 8) +
        path.extname(file.originalname)
    ),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", auth, authorizeRoles("admin"), listAdmin);
router.post("/", auth, authorizeRoles("admin"), upload.single("file"), create);
router.delete("/:id", auth, authorizeRoles("admin"), remove);
router.get("/:id/download", auth, authorizeRoles("admin"), download);
router.get("/:id/preview", auth, authorizeRoles("admin"), preview);

module.exports = router;
