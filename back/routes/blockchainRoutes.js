const express = require("express");
const router = express.Router();
const {
  getAllBlockchainRequests,
  syncFromDB,
  getBlockchainStatus, // ✅ add this
  getAllFinancialTransactions,
} = require("../controllers/blockchainController");
const { auth, authorize } = require("../middleware/authMiddleware");

router.get("/requests", auth, getAllBlockchainRequests);
router.post("/sync-from-db", auth, authorize("admin"), syncFromDB);
router.get("/status", auth, getBlockchainStatus); // ✅ new route
router.get("/financial-transactions", auth, getAllFinancialTransactions);

module.exports = router;
