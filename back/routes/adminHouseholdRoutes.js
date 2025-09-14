const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminHouseholdCtrl = require("../controllers/adminHouseholdController");

router.use(auth, authorize("admin"));

router.get("/", adminHouseholdCtrl.list);
router.post("/", adminHouseholdCtrl.create);
router.patch("/:id", adminHouseholdCtrl.update);
router.delete("/:id", adminHouseholdCtrl.remove);

// Utility fees
router.get("/:id/garbage", adminHouseholdCtrl.garbageSummary);
router.post("/:id/garbage/pay", adminHouseholdCtrl.payGarbage);
router.get("/:id/electric", adminHouseholdCtrl.electricSummary);
router.post("/:id/electric/pay", adminHouseholdCtrl.payElectric);

module.exports = router;