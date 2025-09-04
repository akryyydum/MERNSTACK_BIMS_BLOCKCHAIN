const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminResidentCtrl = require("../controllers/adminResidentController");

router.use(auth, authorize("admin"));

router.post("/", adminResidentCtrl.create);
router.get("/", adminResidentCtrl.list); // <-- Added line

module.exports = router;