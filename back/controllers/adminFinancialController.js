const FinancialTransaction = require("../models/financialTransaction.model");
const DocumentRequest = require("../models/document.model");
const Resident = require("../models/resident.model");
const StreetlightPayment = require("../models/streetlightPayment.model");
const GasPayment = require("../models/gasPayment.model");
const UtilityPayment = require("../models/utilityPayment.model");

// Get dashboard statistics
const getDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    // Fetch regular financial transactions
    const transactions = await FinancialTransaction.find(filter);

    // Fetch streetlight payments and convert to transaction format for calculations
    let streetlightTransactions = [];
    
    // Create date filter for streetlight payments if needed
    const streetlightFilter = {};
    if (startDate || endDate) {
      streetlightFilter.updatedAt = {};
      if (startDate) streetlightFilter.updatedAt.$gte = new Date(startDate);
      if (endDate) streetlightFilter.updatedAt.$lte = new Date(endDate);
    }
    
    const streetlightPayments = await StreetlightPayment.find(streetlightFilter);

    // Convert streetlight payments to transaction format for statistics
    streetlightTransactions = streetlightPayments.flatMap(payment => 
      payment.payments.map(paymentEntry => ({
        type: 'streetlight_fee',
        category: 'revenue',
        amount: paymentEntry.amount,
        transactionDate: paymentEntry.paidAt
      }))
    );

    // Combine all transactions for calculations
    const allTransactions = [...transactions, ...streetlightTransactions];

    // Calculate statistics
    const totalRevenue = allTransactions
      .filter(t => t.category === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = allTransactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAllocations = allTransactions
      .filter(t => t.category === 'allocation')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalRevenue - totalExpenses - totalAllocations;

    // Transaction counts by type
    const documentFees = allTransactions.filter(t => t.type === 'document_fee').length;
    const garbageFees = allTransactions.filter(t => t.type === 'garbage_fee').length;
    const electricFees = allTransactions.filter(t => t.type === 'electric_fee').length;
    const streetlightFees = allTransactions.filter(t => t.type === 'streetlight_fee').length;
    const permitFees = allTransactions.filter(t => t.type === 'permit_fee').length;

    // Recent transactions (using original transactions for proper population)
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
      .slice(0, 10);

    res.json({
      statistics: {
        totalRevenue,
        totalExpenses,
        totalAllocations,
        balance,
        transactionCounts: {
          documentFees,
          garbageFees,
          electricFees,
          streetlightFees,
          permitFees,
          total: allTransactions.length
        }
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get transactions with filters
const getTransactions = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      type, 
      category, 
      status,
      residentId,
      officialId
    } = req.query;

    const filter = {};
    
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (residentId) filter.residentId = residentId;
    if (officialId) filter.officialId = officialId;

    // Fetch regular financial transactions
    const transactions = await FinancialTransaction.find(filter)
      .populate('residentId', 'firstName lastName')
      .populate('officialId', 'firstName lastName position')
      .populate('createdBy', 'username fullName')
      .sort({ transactionDate: -1 });

    // Fetch streetlight payments and convert to transaction format
    let streetlightTransactions = [];
    
    // Create date filter for streetlight payments if needed
    const streetlightFilter = {};
    if (startDate || endDate) {
      streetlightFilter.updatedAt = {};
      if (startDate) streetlightFilter.updatedAt.$gte = new Date(startDate);
      if (endDate) streetlightFilter.updatedAt.$lte = new Date(endDate);
    }
    
    // Only include streetlight transactions if no specific type filter OR if type is streetlight_fee
    if (!type || type === 'streetlight_fee') {
      const streetlightPayments = await StreetlightPayment.find(streetlightFilter)
        .populate({
          path: 'household',
          populate: {
            path: 'head',
            select: 'firstName lastName'
          }
        })
        .sort({ updatedAt: -1 });

      // Convert streetlight payments to transaction format
      streetlightTransactions = streetlightPayments.flatMap(payment => 
        payment.payments.map(paymentEntry => ({
          _id: `streetlight_${payment._id}_${paymentEntry.paidAt}`,
          type: 'streetlight_fee',
          category: 'revenue',
          description: `Streetlight fee payment for ${payment.month}`,
          amount: paymentEntry.amount,
          transactionDate: paymentEntry.paidAt,
          status: 'completed',
          paymentMethod: paymentEntry.method || 'cash',
          referenceNumber: paymentEntry.reference,
          residentId: payment.household?.head || null,
          householdId: payment.household?._id,
          month: payment.month,
          createdAt: paymentEntry.paidAt,
          updatedAt: paymentEntry.paidAt,
          isStreetlightPayment: true
        }))
      );
    }

    // Combine and sort all transactions
    const allTransactions = [...transactions, ...streetlightTransactions]
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    res.json({ transactions: allTransactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new transaction
const createTransaction = async (req, res) => {
  try {
    const {
      type,
      category,
      description,
      amount,
      residentId,
      officialId,
      householdId,
      paymentMethod,
      referenceNumber,
      allocation
    } = req.body;

    // Fetch and store names
    let residentName = null;
    let officialName = null;

    if (residentId) {
      const resident = await Resident.findById(residentId).select('firstName lastName');
      if (resident) {
        residentName = `${resident.firstName} ${resident.lastName}`;
      }
    }

    if (officialId) {
      const Official = require('../models/user.model'); // Adjust path as needed
      const official = await Official.findById(officialId).select('firstName lastName');
      if (official) {
        officialName = `${official.firstName} ${official.lastName}`;
      }
    }

    const transaction = new FinancialTransaction({
      type,
      category,
      description,
      amount,
      residentId,
      officialId,
      residentName,
      officialName,
      householdId,
      paymentMethod,
      referenceNumber,
      allocation,
      createdBy: req.user.id,
      status: 'completed'
    });

    await transaction.save();

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sync document fees from document requests
const syncDocumentFees = async (req, res) => {
  try {
    // Find all approved document requests that haven't been synced
    const documentRequests = await DocumentRequest.find({
      status: 'approved',
      financialTransactionId: { $exists: false }
    }).populate('residentId');

    let syncedCount = 0;

    for (const doc of documentRequests) {
      // Create financial transaction
      const transaction = new FinancialTransaction({
        type: 'document_fee',
        category: 'revenue',
        description: `${doc.documentType} - ${doc.purpose}`,
        amount: doc.totalFee || 0,
        residentId: doc.residentId._id,
        residentName: `${doc.residentId.firstName} ${doc.residentId.lastName}`,
        documentRequestId: doc._id,
        paymentMethod: doc.paymentMethod || 'cash',
        referenceNumber: doc.referenceNumber,
        createdBy: req.user.id,
        status: 'completed'
      });

      await transaction.save();

      // Update document request with transaction ID
      doc.financialTransactionId = transaction._id;
      await doc.save();

      syncedCount++;
    }

    res.json({
      message: `Successfully synced ${syncedCount} document fee(s)`,
      syncedCount
    });
  } catch (error) {
    console.error('Error syncing document fees:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate financial report
const generateReport = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }
    if (type) filter.type = type;

    // Fetch regular financial transactions
    const transactions = await FinancialTransaction.find(filter)
      .populate('residentId', 'firstName lastName')
      .populate('officialId', 'firstName lastName')
      .sort({ transactionDate: 1 });

    // Fetch streetlight payments and convert to transaction format for reports
    let streetlightTransactions = [];
    
    // Create date filter for streetlight payments if needed
    const streetlightFilter = {};
    if (startDate || endDate) {
      streetlightFilter.updatedAt = {};
      if (startDate) streetlightFilter.updatedAt.$gte = new Date(startDate);
      if (endDate) streetlightFilter.updatedAt.$lte = new Date(endDate);
    }
    
    // Only include streetlight transactions if no specific type filter OR if type is streetlight_fee
    if (!type || type === 'streetlight_fee') {
      const streetlightPayments = await StreetlightPayment.find(streetlightFilter)
        .populate({
          path: 'household',
          populate: {
            path: 'head',
            select: 'firstName lastName'
          }
        })
        .sort({ updatedAt: 1 });

      // Convert streetlight payments to transaction format
      streetlightTransactions = streetlightPayments.flatMap(payment => 
        payment.payments.map(paymentEntry => ({
          _id: `streetlight_${payment._id}_${paymentEntry.paidAt}`,
          type: 'streetlight_fee',
          category: 'revenue',
          description: `Streetlight fee payment for ${payment.month}`,
          amount: paymentEntry.amount,
          transactionDate: paymentEntry.paidAt,
          status: 'completed',
          paymentMethod: paymentEntry.method || 'cash',
          referenceNumber: paymentEntry.reference,
          residentId: payment.household?.head || null,
          householdId: payment.household?._id,
          month: payment.month,
          createdAt: paymentEntry.paidAt,
          updatedAt: paymentEntry.paidAt,
          isStreetlightPayment: true
        }))
      );
    }

    // Combine all transactions
    const allTransactions = [...transactions, ...streetlightTransactions]
      .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));

    // Calculate totals
    const summary = {
      totalRevenue: allTransactions.filter(t => t.category === 'revenue').reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: allTransactions.filter(t => t.category === 'expense').reduce((sum, t) => sum + t.amount, 0),
      totalAllocations: allTransactions.filter(t => t.category === 'allocation').reduce((sum, t) => sum + t.amount, 0),
      transactionCount: allTransactions.length
    };

    summary.balance = summary.totalRevenue - summary.totalExpenses - summary.totalAllocations;

    res.json({
      report: {
        period: { startDate, endDate },
        summary,
        transactions: allTransactions
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update financial transaction
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const transaction = await FinancialTransaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Don't allow updating blockchain-verified transactions
    if (transaction.blockchain?.verified) {
      return res.status(400).json({ 
        message: 'Cannot update blockchain-verified transactions' 
      });
    }

    // Update resident/official names if IDs changed
    if (updates.residentId && updates.residentId !== transaction.residentId?.toString()) {
      const resident = await Resident.findById(updates.residentId).select('firstName lastName');
      if (resident) {
        updates.residentName = `${resident.firstName} ${resident.lastName}`;
      }
    }

    if (updates.officialId && updates.officialId !== transaction.officialId?.toString()) {
      const Official = require('../models/user.model');
      const official = await Official.findById(updates.officialId).select('firstName lastName');
      if (official) {
        updates.officialName = `${official.firstName} ${official.lastName}`;
      }
    }

    // Update fields
    Object.assign(transaction, updates);
    transaction.updatedBy = req.user.id;
    
    await transaction.save();

    res.json({ 
      message: 'Transaction updated successfully', 
      transaction 
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete financial transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('=== DELETE TRANSACTION ===');
    console.log('Received ID:', id);
    console.log('User:', req.user);

    // Validate ID format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ID format');
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }

    const transaction = await FinancialTransaction.findById(id);
    
    console.log('Transaction found:', transaction ? 'YES' : 'NO');
    if (transaction) {
      console.log('Transaction details:', {
        id: transaction._id,
        transactionId: transaction.transactionId,
        status: transaction.status,
        blockchainVerified: transaction.blockchain?.verified
      });
    }
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Don't allow deleting blockchain-verified transactions
    if (transaction.blockchain?.verified) {
      console.log('Transaction is blockchain verified, cannot delete');
      return res.status(400).json({ 
        message: 'Cannot delete blockchain-verified transactions' 
      });
    }

    // Soft delete by updating status
    transaction.status = 'cancelled';
    transaction.updatedBy = req.user.id;
    await transaction.save();

    console.log('Transaction soft deleted successfully');
    console.log('=== END DELETE TRANSACTION ===');

    res.json({ 
      message: 'Transaction deleted successfully',
      deletedId: id 
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Bulk delete transactions
const bulkDeleteTransactions = async (req, res) => {
  try {
    const { ids } = req.body;

    console.log('=== BULK DELETE TRANSACTIONS ===');
    console.log('Received IDs:', ids);
    console.log('User:', req.user);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide transaction IDs' });
    }

    // Validate all IDs
    const mongoose = require('mongoose');
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      console.log('Invalid IDs found:', invalidIds);
      return res.status(400).json({ 
        message: 'Invalid transaction ID format',
        invalidIds 
      });
    }

    // Check for blockchain-verified transactions
    const verifiedTransactions = await FinancialTransaction.find({
      _id: { $in: ids },
      'blockchain.verified': true
    });

    console.log('Verified transactions found:', verifiedTransactions.length);

    if (verifiedTransactions.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete blockchain-verified transactions',
        verifiedCount: verifiedTransactions.length,
        verifiedIds: verifiedTransactions.map(t => t._id)
      });
    }

    // Perform bulk update
    const result = await FinancialTransaction.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'cancelled',
          updatedBy: req.user.id,
          updatedAt: new Date()
        }
      }
    );

    console.log('Bulk delete result:', result);
    console.log('=== END BULK DELETE TRANSACTIONS ===');

    res.json({ 
      message: `${result.modifiedCount} transaction(s) deleted successfully`,
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error bulk deleting transactions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Export all functions
module.exports = {
  getDashboard,
  getTransactions,
  createTransaction,
  syncDocumentFees,
  generateReport,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions
};