const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminResidentCtrl = require("../controllers/adminResidentController");

router.use(auth, authorize("admin"));

router.post("/", adminResidentCtrl.create);
router.get("/", adminResidentCtrl.list); // <-- Added line
router.patch("/:id", adminResidentCtrl.update);      // Edit resident
router.delete("/:id", adminResidentCtrl.remove);     // Delete resident
router.patch("/:id/verify", adminResidentCtrl.verify); // Verify resident

module.exports = router;