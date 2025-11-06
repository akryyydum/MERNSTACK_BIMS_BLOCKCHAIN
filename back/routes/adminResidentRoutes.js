const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminResidentController");
const { auth, authorize } = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// CRUD routes
router.get("/", auth, authorize("admin"), controller.list);
router.post("/", auth, authorize("admin"), controller.create);
router.patch("/:id", auth, authorize("admin"), controller.update);
router.delete("/:id", auth, authorize("admin"), controller.remove);
router.patch("/:id/verify", auth, authorize("admin"), controller.verify);

// ✅ Excel import
router.post(
  "/import",
  auth,
  authorize("admin"),
  upload.single("file"),
  controller.bulkImport
);

module.exports = router;
