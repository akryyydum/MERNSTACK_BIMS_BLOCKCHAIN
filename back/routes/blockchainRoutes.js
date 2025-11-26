const express = require("express");
const router = express.Router();
const {
  getAllBlockchainRequests,
  syncFromDB,
  getBlockchainStatus,
  getBlockchainStatusLite,
  getAllFinancialTransactions,
  getResidentBlockchainRequests,
  getResidentFinancialTransactions,
} = require("../controllers/blockchainController");
const { auth, authorize } = require("../middleware/authMiddleware");

router.get("/requests", auth, getAllBlockchainRequests);
router.post("/sync-from-db", auth, authorize("admin"), syncFromDB);
router.get("/status", auth, getBlockchainStatus); // admin-only detailed status
router.get("/status-lite", auth, getBlockchainStatusLite); // resident accessible lite status
router.get("/financial-transactions", auth, getAllFinancialTransactions);
// Resident scoped endpoints
router.get("/requests/me", auth, getResidentBlockchainRequests);
router.get("/financial-transactions/me", auth, getResidentFinancialTransactions);

module.exports = router;
