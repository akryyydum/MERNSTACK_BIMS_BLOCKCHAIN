const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const {
  getDashboard,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  generateReport,
  syncDocumentFees
} = require('../controllers/adminFinancialController');

// Protect all routes
router.use(auth, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);
router.get('/reports', generateReport);
router.post('/sync-document-fees', syncDocumentFees);

module.exports = router;