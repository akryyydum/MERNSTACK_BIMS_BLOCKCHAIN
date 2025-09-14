const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");
const adminHouseholdCtrl = require("../controllers/adminHouseholdController");

router.use(auth, authorize("admin"));

router.get("/", adminHouseholdCtrl.list);
router.post("/", adminHouseholdCtrl.create);
router.patch("/:id", adminHouseholdCtrl.update);
router.delete("/:id", adminHouseholdCtrl.remove);
router.get("/:id/gas", adminHouseholdCtrl.gasSummary);
router.post("/:id/gas/pay", adminHouseholdCtrl.payGas);

module.exports = router;