const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminOfficialController = require("../controllers/adminOfficialController");

router.use(auth, authorize("admin"));

router.get("/", adminOfficialController.list);
router.post("/", adminOfficialController.create);
router.patch("/:id", adminOfficialController.update);
router.delete("/:id", adminOfficialController.remove);

module.exports = router;
