const mongoose = require("mongoose");
const FinancialTransaction = require("../models/financialTransaction.model");
const DocumentRequest = require("../models/document.model");
const Resident = require("../models/resident.model");

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

    const transactions = await FinancialTransaction.find(filter);

    // Calculate statistics
    const totalRevenue = transactions
      .filter(t => t.category === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAllocations = transactions
      .filter(t => t.category === 'allocation')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalRevenue - totalExpenses - totalAllocations;

    // Transaction counts by type
    const documentFees = transactions.filter(t => t.type === 'document_fee').length;
    const garbageFees = transactions.filter(t => t.type === 'garbage_fee').length;
    const electricFees = transactions.filter(t => t.type === 'electric_fee').length;
    const permitFees = transactions.filter(t => t.type === 'permit_fee').length;

    // Recent transactions
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
          permitFees,
          total: transactions.length
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

    const transactions = await FinancialTransaction.find(filter)
      .populate('residentId', 'firstName lastName')
      .populate('officialId', 'firstName lastName position')
      .populate('createdBy', 'username fullName')
      .sort({ transactionDate: -1 });

    res.json({ transactions });
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

    const transactions = await FinancialTransaction.find(filter)
      .populate('residentId', 'firstName lastName')
      .populate('officialId', 'firstName lastName')
      .sort({ transactionDate: 1 });

    // Calculate totals
    const summary = {
      totalRevenue: transactions.filter(t => t.category === 'revenue').reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: transactions.filter(t => t.category === 'expense').reduce((sum, t) => sum + t.amount, 0),
      totalAllocations: transactions.filter(t => t.category === 'allocation').reduce((sum, t) => sum + t.amount, 0),
      transactionCount: transactions.length
    };

    summary.balance = summary.totalRevenue - summary.totalExpenses - summary.totalAllocations;

    res.json({
      report: {
        period: { startDate, endDate },
        summary,
        transactions
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

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ message: "Missing transaction identifier" });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    const deletionFilter = isObjectId
      ? { _id: id }
      : { transactionId: id };

    const deleted = await FinancialTransaction.findOneAndDelete(deletionFilter);

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (deleted.documentRequestId) {
      await DocumentRequest.findByIdAndUpdate(
        deleted.documentRequestId,
        { $unset: { financialTransactionId: "" } },
        { new: true }
      );
    }

    res.json({
      message: "Transaction deleted permanently",
      deletedId: deleted._id?.toString(),
      deletedTransactionId: deleted.transactionId,
      deletedBy: isObjectId ? "_id" : "transactionId"
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

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide transaction IDs' });
    }

    const objectIdFilters = new Set();
    const transactionIdFilters = new Set();
    const invalidIds = [];

    ids.forEach((original) => {
      if (original === null || original === undefined) {
        invalidIds.push(original);
        return;
      }

      let value = original;

      if (typeof value === 'string') {
        value = value.trim();
      }

      if (value === '' || value === 'undefined' || value === 'null') {
        invalidIds.push(original);
        return;
      }

      const stringValue = typeof value === 'string' ? value : String(value);

      if (mongoose.Types.ObjectId.isValid(stringValue)) {
        objectIdFilters.add(stringValue);
        return;
      }

      if (typeof stringValue === 'string' && stringValue.length > 0) {
        transactionIdFilters.add(stringValue);
        return;
      }

      invalidIds.push(original);
    });

    const objectIdList = Array.from(objectIdFilters);
    const transactionIdList = Array.from(transactionIdFilters);

    if (!objectIdList.length && !transactionIdList.length) {
      return res.status(400).json({
        message: 'Invalid transaction ID format',
        invalidIds
      });
    }

    const filters = [];
    if (objectIdList.length) filters.push({ _id: { $in: objectIdList } });
    if (transactionIdList.length) filters.push({ transactionId: { $in: transactionIdList } });

    if (!filters.length) {
      return res.status(400).json({ message: 'No valid transaction identifiers provided' });
    }

    const combinedFilter = filters.length === 1 ? filters[0] : { $or: filters };

    const transactionsToDelete = await FinancialTransaction.find(combinedFilter)
      .select('_id transactionId documentRequestId');

    const result = await FinancialTransaction.deleteMany(combinedFilter);

    if (transactionsToDelete.length) {
      const docRequestIds = transactionsToDelete
        .map((tx) => tx.documentRequestId)
        .filter(Boolean);

      if (docRequestIds.length) {
        await DocumentRequest.updateMany(
          { _id: { $in: docRequestIds } },
          { $unset: { financialTransactionId: "" } }
        );
      }
    }

    res.json({
      message: `${result.deletedCount} transaction(s) deleted permanently`,
      deletedCount: result.deletedCount,
      invalidIds
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