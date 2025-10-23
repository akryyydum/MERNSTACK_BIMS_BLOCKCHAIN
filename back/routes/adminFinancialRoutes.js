const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/authMiddleware");

const {
  getDashboard,
  getTransactions,
  createTransaction,
  syncDocumentFees,
  generateReport,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  cleanupOrphanedPayments,
  cleanupOldTransactions
} = require("../controllers/adminFinancialController");

// Middleware shorthand
const authMiddleware = [auth, authorize("admin")];

// Request logging middleware
router.use((req, res, next) => {
  console.log(`[Financial Routes] ${req.method} ${req.path}`);
  console.log('[Financial Routes] Body:', req.body);
  console.log('[Financial Routes] Params:', req.params);
  next();
});

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Financial routes working!", timestamp: new Date() });
});

// Existing routes
router.get("/dashboard", authMiddleware, getDashboard);
router.get("/transactions", authMiddleware, getTransactions);
router.post("/transactions", authMiddleware, createTransaction);
router.post("/sync-document-fees", authMiddleware, syncDocumentFees);
router.get("/reports", authMiddleware, generateReport);

// CRUD routes
router.put("/transactions/:id", authMiddleware, updateTransaction);
router.delete("/transactions/:id", authMiddleware, deleteTransaction);
router.post("/transactions/bulk-delete", authMiddleware, bulkDeleteTransactions);
router.post("/cleanup-orphaned", authMiddleware, cleanupOrphanedPayments);
router.post("/cleanup-old-transactions", authMiddleware, cleanupOldTransactions);

// Utility payment reset route
router.delete("/utility-payments/reset-all", authMiddleware, async (req, res) => {
  try {
    console.log('=== RESET ALL UTILITY PAYMENTS ===');
    const UtilityPayment = require('../models/utilityPayment.model');
    
    // Get current totals before reset
    const beforeReset = await UtilityPayment.aggregate([
      { $group: {
        _id: '$type',
        totalAmount: { $sum: '$amountPaid' },
        count: { $sum: 1 }
      }}
    ]);
    
    console.log('Before reset totals:', beforeReset);
    
    // Delete ALL utility payment records
    const deleteResult = await UtilityPayment.deleteMany({});
    
    console.log('Reset complete - deleted records:', deleteResult.deletedCount);
    
    res.json({
      message: `Reset complete. Deleted all ${deleteResult.deletedCount} utility payment records`,
      deletedCount: deleteResult.deletedCount,
      beforeReset: beforeReset
    });
    
  } catch (error) {
    console.error('Error resetting utility payments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;