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
  bulkDeleteTransactions
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

module.exports = router;