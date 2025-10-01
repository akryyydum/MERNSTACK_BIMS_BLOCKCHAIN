const FinancialTransaction = require('../models/financialTransaction.model');
const DocumentRequest = require('../models/document.model');
const Household = require('../models/household.model');
const Resident = require('../models/resident.model');
const mongoose = require('mongoose');

// Get financial dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get transaction summaries
    const [revenues, expenses, allocations] = await Promise.all([
      FinancialTransaction.aggregate([
        { $match: { category: 'revenue', status: 'completed', ...dateFilter } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      FinancialTransaction.aggregate([
        { $match: { category: 'expense', status: 'completed', ...dateFilter } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      FinancialTransaction.aggregate([
        { $match: { category: 'allocation', status: 'completed', ...dateFilter } },
        { $group: { _id: '$allocation.department', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    // Get monthly trends
    const monthlyTrends = await FinancialTransaction.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: {
            year: { $year: '$transactionDate' },
            month: { $month: '$transactionDate' },
            category: '$category'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get recent transactions
    const recentTransactions = await FinancialTransaction.find({
      status: 'completed',
      ...dateFilter
    })
    .populate('residentId', 'firstName lastName')
    .populate('createdBy', 'username')
    .sort({ transactionDate: -1 })
    .limit(10);

    res.json({
      revenues,
      expenses,
      allocations,
      monthlyTrends,
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching financial dashboard:', error);
    res.status(500).json({ message: 'Failed to load financial data' });
  }
};

// Get all transactions with filters
exports.getTransactions = async (req, res) => {
  try {
    const { 
      type, 
      category, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const transactions = await FinancialTransaction.find(filter)
      .populate('residentId', 'firstName middleName lastName')
      .populate('householdId', 'householdId')
      .populate('documentRequestId', 'documentType')
      .populate('createdBy', 'username')
      .populate('allocation.approvedBy', 'username')
      .sort({ transactionDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FinancialTransaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Failed to load transactions' });
  }
};

// Create transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      category,
      description,
      amount,
      residentId,
      householdId,
      documentRequestId,
      paymentMethod,
      referenceNumber,
      allocation
    } = req.body;

    // Generate transaction ID manually if needed
    const count = await FinancialTransaction.countDocuments({});
    const prefix = type === 'document_fee' ? 'DOC' : 
                   type === 'garbage_fee' ? 'GRB' : 
                   type === 'electric_fee' ? 'ELC' : 
                   type === 'permit_fee' ? 'PRM' : 'TXN';
    const transactionId = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const transaction = new FinancialTransaction({
      transactionId,
      type,
      category,
      description,
      amount: Number(amount),
      residentId: residentId || null,
      householdId: householdId || null,
      documentRequestId: documentRequestId || null,
      paymentMethod: paymentMethod || 'cash',
      referenceNumber: referenceNumber || null,
      allocation: allocation || null,
      createdBy: req.user.id
    });

    await transaction.save();

    // TODO: Integrate with Hyperledger Fabric
    await recordToBlockchain(transaction);

    const populated = await FinancialTransaction.findById(transaction._id)
      .populate('residentId', 'firstName middleName lastName')
      .populate('householdId', 'householdId')
      .populate('createdBy', 'username');

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Failed to create transaction' });
  }
};

// Update transaction
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user.id },
      { new: true }
    )
    .populate('residentId', 'firstName middleName lastName')
    .populate('householdId', 'householdId')
    .populate('createdBy', 'username');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Update blockchain record
    await updateBlockchainRecord(transaction);

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Failed to update transaction' });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await FinancialTransaction.findByIdAndDelete(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Failed to delete transaction' });
  }
};

// Generate financial report
exports.generateReport = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    const dateFilter = {
      transactionDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    let reportData = {};

    switch (type) {
      case 'summary':
        reportData = await generateSummaryReport(dateFilter);
        break;
      case 'detailed':
        reportData = await generateDetailedReport(dateFilter);
        break;
      case 'allocation':
        reportData = await generateAllocationReport(dateFilter);
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    res.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
};

// Sync completed document requests to financial transactions
exports.syncDocumentFees = async (req, res) => {
  try {
    const completedRequests = await DocumentRequest.find({
      status: 'completed',
      'blockchain.hash': { $exists: true }
    }).populate('residentId');

    let syncedCount = 0;

    for (const request of completedRequests) {
      // Check if transaction already exists
      const existingTransaction = await FinancialTransaction.findOne({
        documentRequestId: request._id
      });

      if (!existingTransaction) {
        // Create financial transaction for document fee
        const feeAmount = getDocumentFee(request.documentType);
        
        const transaction = new FinancialTransaction({
          type: 'document_fee',
          category: 'revenue',
          description: `${request.documentType} - ${request.residentId?.firstName} ${request.residentId?.lastName}`,
          amount: feeAmount,
          residentId: request.residentId._id,
          documentRequestId: request._id,
          paymentMethod: 'cash',
          status: 'completed',
          transactionDate: request.updatedAt,
          completedDate: request.updatedAt,
          createdBy: req.user.id
        });

        await transaction.save();
        await recordToBlockchain(transaction);
        syncedCount++;
      }
    }

    res.json({ message: `Synced ${syncedCount} document fee transactions` });
  } catch (error) {
    console.error('Error syncing document fees:', error);
    res.status(500).json({ message: 'Failed to sync document fees' });
  }
};

// Helper functions
async function recordToBlockchain(transaction) {
  try {
    // TODO: Implement Hyperledger Fabric integration
    // For now, simulate blockchain recording
    const blockchainData = {
      hash: generateHash(transaction),
      txId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockNumber: Math.floor(Math.random() * 1000000),
      issuedBy: 'BMS_ADMIN',
      issuedAt: new Date(),
      verified: true
    };

    await FinancialTransaction.findByIdAndUpdate(transaction._id, {
      blockchain: blockchainData
    });

    return blockchainData;
  } catch (error) {
    console.error('Error recording to blockchain:', error);
    throw error;
  }
}

async function updateBlockchainRecord(transaction) {
  // TODO: Implement blockchain update logic
  console.log('Updating blockchain record for transaction:', transaction.transactionId);
}

function generateHash(data) {
  const crypto = require('crypto');
  const string = JSON.stringify(data);
  return crypto.createHash('sha256').update(string).digest('hex');
}

function getDocumentFee(documentType) {
  const fees = {
    'Barangay Certificate': 50,
    'Indigency': 30,
    'Barangay Clearance': 100,
    'Residency': 75,
    'Business Clearance': 200
  };
  return fees[documentType] || 50;
}

async function generateSummaryReport(dateFilter) {
  const [totalRevenue, totalExpenses, totalAllocations, transactionCount] = await Promise.all([
    FinancialTransaction.aggregate([
      { $match: { category: 'revenue', status: 'completed', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FinancialTransaction.aggregate([
      { $match: { category: 'expense', status: 'completed', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FinancialTransaction.aggregate([
      { $match: { category: 'allocation', status: 'completed', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    FinancialTransaction.countDocuments({ status: 'completed', ...dateFilter })
  ]);

  return {
    totalRevenue: totalRevenue[0]?.total || 0,
    totalExpenses: totalExpenses[0]?.total || 0,
    totalAllocations: totalAllocations[0]?.total || 0,
    netIncome: (totalRevenue[0]?.total || 0) - (totalExpenses[0]?.total || 0),
    transactionCount
  };
}

async function generateDetailedReport(dateFilter) {
  const transactions = await FinancialTransaction.find({
    status: 'completed',
    ...dateFilter
  })
  .populate('residentId', 'firstName middleName lastName')
  .populate('householdId', 'householdId')
  .populate('documentRequestId', 'documentType')
  .sort({ transactionDate: -1 });

  return { transactions };
}

async function generateAllocationReport(dateFilter) {
  const allocations = await FinancialTransaction.aggregate([
    { $match: { category: 'allocation', status: 'completed', ...dateFilter } },
    {
      $group: {
        _id: '$allocation.department',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        projects: { $addToSet: '$allocation.project' }
      }
    }
  ]);

  return { allocations };
}