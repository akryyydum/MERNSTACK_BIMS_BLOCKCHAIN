const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminResidentController");
const { auth, authorize } = require("../middleware/authMiddleware");

// CRUD routes
router.get("/", auth, authorize("admin"), controller.list);
router.post("/", auth, authorize("admin"), controller.create);
router.patch("/:id", auth, authorize("admin"), controller.update);
router.delete("/:id", auth, authorize("admin"), controller.remove);
router.patch("/:id/verify", auth, authorize("admin"), controller.verify);

// ✅ Import route
router.post(
  "/import",
  auth,
  authorize("admin"),
  controller.importResidentsMiddleware,
  controller.importResidents
);

module.exports = router;
