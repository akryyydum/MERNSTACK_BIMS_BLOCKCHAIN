const express = require("express");
const router = express.Router();
const {
  getAllBlockchainRequests,
  syncFromDB,
  getBlockchainStatus, // ✅ add this
} = require("../controllers/blockchainController");
const { auth, authorize } = require("../middleware/authMiddleware");

router.get("/requests", auth, getAllBlockchainRequests);
router.post("/sync-from-db", auth, authorize("admin"), syncFromDB);
router.get("/status", auth, getBlockchainStatus); // ✅ new route

module.exports = router;
