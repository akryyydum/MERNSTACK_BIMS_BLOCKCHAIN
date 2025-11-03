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
router.get("/garbage-statistics", adminHouseholdCtrl.getGarbageStatistics);
router.get("/:id/garbage", adminHouseholdCtrl.garbageSummary);
router.post("/:id/garbage/pay", adminHouseholdCtrl.payGarbage);
router.delete("/:id/garbage/payments", adminHouseholdCtrl.deleteGarbagePayments);
router.get("/:id/electric", adminHouseholdCtrl.electricSummary);
router.post("/:id/electric/pay", adminHouseholdCtrl.payElectric);
router.get("/streetlight-statistics", adminHouseholdCtrl.getStreetlightStatistics);
router.get("/:id/streetlight", adminHouseholdCtrl.streetlightSummary);
router.post("/:id/streetlight/pay", adminHouseholdCtrl.payStreetlight);
router.delete("/:id/streetlight/payments", adminHouseholdCtrl.deleteStreetlightPayments);

module.exports = router;