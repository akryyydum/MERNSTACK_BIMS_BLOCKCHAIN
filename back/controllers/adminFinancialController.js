const mongoose = require("mongoose");
const FinancialTransaction = require("../models/financialTransaction.model");
const DocumentRequest = require("../models/document.model");
const Resident = require("../models/resident.model");
const StreetlightPayment = require("../models/streetlightPayment.model");
const GasPayment = require("../models/gasPayment.model");
const UtilityPayment = require("../models/utilityPayment.model");
const { submitFinancialTransactionToFabric } = require('../utils/financialFabric');

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
    // Exclude utility types here to avoid double counting when we also pull UtilityPayment
    const nonUtilityTransactions = transactions.filter(
      (t) => !['garbage_fee', 'streetlight_fee'].includes(t.type)
    );

    // Calculate utility revenue using the same logic as individual pages
    const currentYear = new Date().getFullYear();
    
    // Get garbage statistics (yearly total) - only valid payments
    const garbagePayments = await UtilityPayment.find({ 
      type: "garbage",
      month: { $regex: `^${currentYear}-` }
    }).lean();
    
    const garbageRevenue = garbagePayments.reduce((total, payment) => {
      return total + (payment.amountPaid || 0);
    }, 0);
    
    // Get streetlight statistics (yearly total) - only valid payments
    const streetlightPayments = await UtilityPayment.find({ 
      type: "streetlight",
      month: { $regex: `^${currentYear}-` }
    }).lean();
    
    const streetlightRevenue = streetlightPayments.reduce((total, payment) => {
      return total + (payment.amountPaid || 0);
    }, 0);

    console.log('Garbage payments found:', garbagePayments.length, 'Revenue:', garbageRevenue);
    console.log('Streetlight payments found:', streetlightPayments.length, 'Revenue:', streetlightRevenue);
    
  // Fetch ALL utility payments for transaction details
    console.log('Fetching utility payments for transactions...');
    const allUtilityPayments = await UtilityPayment.find({})
      .populate({
        path: 'household',
        populate: {
          path: 'headOfHousehold',
          select: 'firstName lastName'
        }
      });
    
    console.log('Total utility payment records found:', allUtilityPayments.length);
    console.log('Sample utility payment:', JSON.stringify(allUtilityPayments[0], null, 2));

    // Convert utility payments to transaction format for statistics (only those with actual payments)
    const utilityTransactions = allUtilityPayments
      .filter(payment => payment.payments && payment.payments.length > 0)
      .flatMap(payment => {
        return payment.payments.map(paymentEntry => ({
        type: payment.type === 'garbage' ? 'garbage_fee' : 
              payment.type === 'streetlight' ? 'streetlight_fee' : 
              'utility_fee',
        category: 'revenue',
        amount: paymentEntry.amount,
        transactionDate: paymentEntry.paidAt,
        description: `${payment.type.charAt(0).toUpperCase() + payment.type.slice(1)} fee payment for ${payment.month}`,
        residentName: payment.household?.headOfHousehold ? 
          `${payment.household.headOfHousehold.firstName} ${payment.household.headOfHousehold.lastName}` : 
          'Unknown Resident',
        householdId: payment.household?._id,
        month: payment.month,
        method: paymentEntry.method,
        reference: paymentEntry.reference,
        status: 'completed'
      }));
    });

  // Combine non-utility transactions with utility transactions for calculations
  const allTransactions = [...nonUtilityTransactions, ...utilityTransactions];

    // Fetch document requests with amount > 0 (only completed/claimed requests)
    const documentRequests = await DocumentRequest.find({
      status: { $in: ['completed', 'claimed'] },
      amount: { $gt: 0 }
    });
    
    const documentRevenue = documentRequests.reduce((total, doc) => {
      return total + (doc.amount || 0);
    }, 0);
    
    console.log('Document requests found:', documentRequests.length, 'Revenue:', documentRevenue);

    // Calculate statistics using correct totals
    const regularTransactionRevenue = nonUtilityTransactions
      .filter(t => t.category === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Use the calculated utility revenue and document revenue
    const totalRevenue = regularTransactionRevenue + garbageRevenue + streetlightRevenue + documentRevenue;

    console.log('Dashboard - Regular transaction revenue:', regularTransactionRevenue);
    console.log('Dashboard - Garbage revenue:', garbageRevenue);
    console.log('Dashboard - Streetlight revenue:', streetlightRevenue);
    console.log('Dashboard - Document revenue:', documentRevenue);
    console.log('Dashboard - Total revenue calculated:', totalRevenue);

    const totalExpenses = allTransactions
      .filter(t => t.category === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAllocations = allTransactions
      .filter(t => t.category === 'allocation')
      .reduce((sum, t) => sum + t.amount, 0);

    const balance = totalRevenue - totalExpenses - totalAllocations;

    // Transaction counts by type
    const documentFees = allTransactions.filter(t => t.type === 'document_request').length;
    const garbageFees = allTransactions.filter(t => t.type === 'garbage_fee').length;
    const electricFees = allTransactions.filter(t => t.type === 'electric_fee').length;
    const streetlightFees = allTransactions.filter(t => t.type === 'streetlight_fee').length;
    const permitFees = allTransactions.filter(t => t.type === 'permit_fee').length;

    // Monthly trends for chart data
    const monthlyData = {};
    allTransactions.forEach(transaction => {
      const monthKey = new Date(transaction.transactionDate).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0, allocations: 0 };
      }
      if (transaction.category === 'revenue') {
        monthlyData[monthKey].revenue += transaction.amount;
      } else if (transaction.category === 'expense') {
        monthlyData[monthKey].expenses += transaction.amount;
      } else if (transaction.category === 'allocation') {
        monthlyData[monthKey].allocations += transaction.amount;
      }
    });

    // Revenue by type for pie chart using correct totals
    const documentTransactionRevenue = nonUtilityTransactions.filter(t => t.type === 'document_request').reduce((sum, t) => sum + t.amount, 0);
    const totalDocumentRevenue = documentRevenue + documentTransactionRevenue;
    
    const revenueByType = {
      garbage_fee: garbageRevenue,
      streetlight_fee: streetlightRevenue,
      document_request: totalDocumentRevenue,
      permit_fee: nonUtilityTransactions.filter(t => t.type === 'permit_fee').reduce((sum, t) => sum + t.amount, 0),
      other: nonUtilityTransactions
        .filter(t => !['document_request', 'permit_fee'].includes(t.type) && t.category === 'revenue')
        .reduce((sum, t) => sum + t.amount, 0)
    };

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
          total: allTransactions.length
        }
      },
      monthlyTrends: monthlyData,
      revenueByType: revenueByType,
      totalTransactions: allTransactions.length
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    console.log('=== getTransactions called ===');
    console.log('Query params:', req.query);
    
    const { 
      startDate, 
      endDate, 
      type, 
      category, 
      status,
      residentId
    } = req.query; // officialId removed

  let allTransactions = [];

    // Fetch regular financial transactions
    const filter = {};
    
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }
    
    if (type && !['garbage_fee', 'streetlight_fee'].includes(type)) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (residentId) filter.residentId = residentId;
    // officialId filtering removed

    console.log('Fetching FinancialTransactions with filter:', filter);
    const transactions = await FinancialTransaction.find(filter)
      .populate('residentId', 'firstName middleName lastName suffix')
      // officialId populate removed
      .populate('createdBy', 'username fullName')
      .sort({ transactionDate: -1 })
      .lean();
    
    console.log('Found FinancialTransactions:', transactions.length);
    
    // Update resident names dynamically from populated data
    const updatedTransactions = transactions.map(txn => {
      if (txn.residentId) {
        const residentName = [
          txn.residentId.firstName,
          txn.residentId.middleName,
          txn.residentId.lastName,
          txn.residentId.suffix
        ].filter(Boolean).join(' ');
        return { ...txn, residentName };
      }
      return txn;
    });
    
    // Remove utility transactions to avoid duplicates when we add synthesized utility transactions below
    const nonUtilityTransactions = updatedTransactions.filter(
      (t) => !['garbage_fee', 'streetlight_fee'].includes(t.type)
    );

    allTransactions = [...nonUtilityTransactions];

    // Fetch utility payments (garbage and streetlight fees)
    const utilityFilter = {};
    if (startDate || endDate) {
      utilityFilter.updatedAt = {};
      if (startDate) utilityFilter.updatedAt.$gte = new Date(startDate);
      if (endDate) utilityFilter.updatedAt.$lte = new Date(endDate);
    }

    // Add type filter for utility payments
    if (type === 'garbage_fee') {
      utilityFilter.type = 'garbage';
    } else if (type === 'streetlight_fee') {
      utilityFilter.type = 'streetlight';
    }

    // Use the same utility payments as dashboard for consistency
    const currentYear = new Date().getFullYear();
    console.log('Fetching current year utility payments for transactions...');
    console.log('Current year:', currentYear);
    
    // Only get current year utility payments to match what's shown in statistics
    const allUtilityPayments = await UtilityPayment.find({
      month: { $regex: `^${currentYear}-` }
    })
      .populate({
        path: 'household',
        populate: {
          path: 'headOfHousehold',
          select: 'firstName lastName'
        }
      })
      .sort({ updatedAt: -1 })
      .lean();

    console.log('Found current year utility payments for transactions:', allUtilityPayments.length);
    
    // Filter to only show payments that have actual payment entries
    const validUtilityPayments = allUtilityPayments.filter(payment => {
      return payment.payments && payment.payments.length > 0;
    });
    
    console.log('Valid utility payments after filtering:', validUtilityPayments.length);
    
    // Convert utility payments to transaction format (only those with actual payments)
    const utilityTransactions = validUtilityPayments
      .flatMap(payment => {
        console.log(`Processing ${payment.type} payment:`, payment.month, 'with', payment.payments.length, 'payments');
        
        return payment.payments.map((paymentEntry, index) => {
        const transactionType = payment.type === 'garbage' ? 'garbage_fee' : 
                                payment.type === 'streetlight' ? 'streetlight_fee' : 
                                'utility_fee';

        const residentFullName = payment.household?.headOfHousehold 
          ? `${payment.household.headOfHousehold.firstName} ${payment.household.headOfHousehold.lastName}` 
          : 'Unknown Resident';
        
        return {
          _id: `${payment.type}_${payment._id}_${index}`,
          mongoId: payment._id.toString(), // MongoDB ID of the UtilityPayment document
          paymentIndex: index, // Index of the specific payment entry
          transactionId: `${payment.type.toUpperCase()}-${payment.month}-${payment.household?._id?.toString().slice(-6).toUpperCase() || 'UNKNOWN'}`,
          type: transactionType,
          category: 'revenue',
          description: `${payment.type.charAt(0).toUpperCase() + payment.type.slice(1)} Collection Fee - ${payment.month}`,
          amount: paymentEntry.amount,
          transactionDate: paymentEntry.paidAt,
          status: 'completed',
          paymentMethod: paymentEntry.method || 'Cash',
          // referenceNumber removed
          resident: residentFullName,
          residentName: residentFullName,
          // residentId left out on purpose: this is a synthesized row from UtilityPayment
          official: 'System Generated',
          blockchain: 'Pending',
          createdAt: paymentEntry.paidAt,
          updatedAt: paymentEntry.paidAt,
          isUtilityPayment: true,
          householdId: payment.household?._id,
          month: payment.month
        };
      });
    });

    console.log('Converted utility transactions for table:', utilityTransactions.length);
    if (utilityTransactions.length > 0) {
      console.log('Sample utility transaction for table:', utilityTransactions[0]);
      console.log('Sample transaction _id:', utilityTransactions[0]._id);
      console.log('Sample transaction type:', utilityTransactions[0].type);
      console.log('Sample transaction isUtilityPayment:', utilityTransactions[0].isUtilityPayment);
    }

    // Fetch document requests with amount > 0 (only completed/claimed requests)
    const documentFilter = {};
    if (startDate || endDate) {
      documentFilter.updatedAt = {};
      if (startDate) documentFilter.updatedAt.$gte = new Date(startDate);
      if (endDate) documentFilter.updatedAt.$lte = new Date(endDate);
    }
    
    const documentRequests = await DocumentRequest.find({
      ...documentFilter,
      status: { $in: ['completed', 'claimed'] },
      amount: { $gt: 0 }
    })
      .populate('requestedBy', 'firstName lastName')
      .populate('requestFor', 'firstName lastName')
      .sort({ updatedAt: -1 });

    console.log('Found document requests for transactions:', documentRequests.length);
    
    // Convert document requests to transaction format
    const documentTransactions = documentRequests.map(doc => {
      const requester = doc.requestedBy 
        ? `${doc.requestedBy.firstName} ${doc.requestedBy.lastName}` 
        : (doc.requestFor ? `${doc.requestFor.firstName} ${doc.requestFor.lastName}` : 'Unknown');
      
      return {
        _id: `document_${doc._id}`,
        transactionId: doc.trackingNumber || `DOC-${doc._id.toString().slice(-6).toUpperCase()}`,
        type: 'document_request',
        category: 'revenue',
        description: `${doc.documentType} - ${doc.purpose}`,
        amount: doc.amount,
        transactionDate: doc.updatedAt,
        status: 'completed',
        paymentMethod: 'Cash',
        // referenceNumber removed
        resident: requester,
        residentName: requester,
        official: 'Barangay Office',
        blockchain: doc.blockchain?.hash ? 'Recorded' : 'Pending',
        createdAt: doc.requestedAt || doc.createdAt,
        updatedAt: doc.updatedAt,
        isDocumentRequest: true,
        documentType: doc.documentType,
        documentStatus: doc.status
      };
    });

    console.log('Converted document request transactions for table:', documentTransactions.length);
    
    allTransactions = [...allTransactions, ...utilityTransactions, ...documentTransactions];

    // Apply filters after fetching all data
    console.log('All transactions before filtering:', allTransactions.length);
    
    // Apply type filter
    if (type) {
      allTransactions = allTransactions.filter(t => t.type === type);
      console.log(`After type filter (${type}):`, allTransactions.length);
    }
    
    // Apply category filter
    if (category) {
      allTransactions = allTransactions.filter(t => t.category === category);
      console.log(`After category filter (${category}):`, allTransactions.length);
    }
    
    // Apply status filter
    if (status) {
      allTransactions = allTransactions.filter(t => t.status === status);
      console.log(`After status filter (${status}):`, allTransactions.length);
    }

    // Apply date filtering
    if (startDate || endDate) {
      allTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.transactionDate);
        if (startDate && transactionDate < new Date(startDate)) return false;
        if (endDate && transactionDate > new Date(endDate)) return false;
        return true;
      });
      console.log(`After date filter (${startDate} to ${endDate}):`, allTransactions.length);
    }

    // Sort all transactions by date
    allTransactions.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    console.log('Final transactions count:', allTransactions.length);
    
    // Debug: Log a few sample transactions to see their _id format
    console.log('=== SAMPLE TRANSACTIONS BEING RETURNED ===');
    allTransactions.slice(0, 3).forEach((tx, index) => {
      console.log(`Transaction ${index + 1}:`, {
        _id: tx._id,
        transactionId: tx.transactionId,
        type: tx.type,
        isUtilityPayment: tx.isUtilityPayment,
        amount: tx.amount
      });
    });
    console.log('=== END SAMPLE TRANSACTIONS ===');
    
    res.json({ transactions: allTransactions });
  } catch (error) {
    console.error('!!! Error in getTransactions !!!');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
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
      householdId,
      paymentMethod,
      allocation
    } = req.body; // officialId removed

    // Fetch and store names
    let residentName = null;

    if (residentId) {
      const resident = await Resident.findById(residentId).select('firstName lastName');
      if (resident) {
        residentName = `${resident.firstName} ${resident.lastName}`;
      }
    } else {
      // Default name when no resident is selected
      residentName = 'Barangay Official';
    }

    // officialId removed: no longer recorded

    const transaction = new FinancialTransaction({
      type,
      category,
      description,
      amount,
      residentId,
      residentName,
      householdId,
      paymentMethod,
      allocation,
      createdBy: req.user.id,
      status: 'completed'
    });

    await transaction.save();

    // Attempt to submit to Fabric (non-fatal)
    try {
      const result = await submitFinancialTransactionToFabric(transaction);
      if (!result.ok) console.warn('Fabric submit warning:', result.error);
    } catch (fbErr) {
      console.error('Error submitting new financial transaction to Fabric:', fbErr.message || fbErr);
    }

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
        type: 'document_request',
        category: 'revenue',
        description: `${doc.documentType} - ${doc.purpose}`,
        amount: doc.totalFee || 0,
        residentId: doc.residentId._id,
        residentName: `${doc.residentId.firstName} ${doc.residentId.lastName}`,
        documentRequestId: doc._id,
        paymentMethod: doc.paymentMethod || 'cash',
        // referenceNumber removed
        createdBy: req.user.id,
        status: 'completed'
      });

      await transaction.save();

      // Update document request with transaction ID
      doc.financialTransactionId = transaction._id;
      await doc.save();

      // Mirror to Fabric (non-blocking)
      try {
        const result = await submitFinancialTransactionToFabric(transaction);
        if (!result.ok) console.warn('Fabric sync warning for document fee:', result.error);
      } catch (fbErr) {
        console.error('Error submitting synced document fee to Fabric:', fbErr.message || fbErr);
      }

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
          // referenceNumber removed
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

    // official updates removed; officials are no longer recorded

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
    const { paymentIndex } = req.query; // Get payment index from query params if it's a utility payment
    
    console.log('=== BACKEND DELETE RECEIVED ===');
    console.log('DELETE request received for ID:', id);
    console.log('Payment Index:', paymentIndex);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.originalUrl);
    console.log('User:', req.user?.id || 'No user');
    
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ Invalid ID format');
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    console.log('✓ Valid ObjectId format');
    
    // If paymentIndex is provided, this is a utility payment entry deletion
    if (paymentIndex !== undefined && paymentIndex !== null) {
      console.log('→ Deleting specific payment entry from UtilityPayment...');
      const utilityPayment = await UtilityPayment.findById(id);
      
      if (!utilityPayment) {
        console.log('❌ UtilityPayment document not found');
        return res.status(404).json({ message: 'Utility payment not found' });
      }
      
      const index = parseInt(paymentIndex);
      if (isNaN(index) || index < 0 || index >= utilityPayment.payments.length) {
        console.log('❌ Invalid payment index');
        return res.status(400).json({ message: 'Invalid payment index' });
      }
      
      // Remove the specific payment entry
      const removedPayment = utilityPayment.payments[index];
      utilityPayment.payments.splice(index, 1);
      
      // Recalculate totalAmountPaid
      utilityPayment.totalAmountPaid = utilityPayment.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // If no payments left, delete the entire document
      if (utilityPayment.payments.length === 0) {
        await UtilityPayment.findByIdAndDelete(id);
        console.log('✅ DELETED entire UtilityPayment (no payments remaining)');
      } else {
        await utilityPayment.save();
        console.log('✅ REMOVED payment entry from UtilityPayment');
      }
      
      return res.json({ 
        success: true,
        message: 'Payment entry deleted successfully',
        deletedFrom: 'UtilityPayment',
        deletedPaymentAmount: removedPayment.amount
      });
    }
    
    // Try UtilityPayment collection (full document deletion)
    console.log('→ Searching UtilityPayment collection...');
    let deletedRecord = await UtilityPayment.findByIdAndDelete(id);
    
    if (deletedRecord) {
      console.log('✅ DELETED from UtilityPayment collection');
      console.log('Deleted record details:', {
        id: deletedRecord._id,
        type: deletedRecord.type,
        month: deletedRecord.month,
        totalAmountPaid: deletedRecord.totalAmountPaid
      });
      return res.json({ 
        success: true,
        message: 'Transaction deleted successfully',
        deletedFrom: 'UtilityPayment',
        deletedId: id
      });
    }
    
    console.log('→ Not found in UtilityPayment, trying FinancialTransaction...');
    
    // Try FinancialTransaction collection
    deletedRecord = await FinancialTransaction.findByIdAndDelete(id);
    
    if (deletedRecord) {
      console.log('✅ DELETED from FinancialTransaction collection');
      console.log('Deleted record details:', {
        id: deletedRecord._id,
        type: deletedRecord.type,
        amount: deletedRecord.amount,
        description: deletedRecord.description
      });
      return res.json({ 
        success: true,
        message: 'Transaction deleted successfully',
        deletedFrom: 'FinancialTransaction',
        deletedId: id
      });
    }
    
    console.log('→ Not found in FinancialTransaction, trying DocumentRequest...');
    
    // Try DocumentRequest collection
    deletedRecord = await DocumentRequest.findByIdAndDelete(id);
    
    if (deletedRecord) {
      console.log('✅ DELETED from DocumentRequest collection');
      console.log('Deleted record details:', {
        id: deletedRecord._id,
        documentType: deletedRecord.documentType,
        amount: deletedRecord.amount
      });
      return res.json({ 
        success: true,
        message: 'Document request transaction deleted successfully',
        deletedFrom: 'DocumentRequest',
        deletedId: id
      });
    }
    
    console.log('❌ Record not found in any collection');
    console.log('Searched ID:', id);
    
    return res.status(404).json({ 
      message: 'Transaction not found',
      searchedId: id,
      searchedCollections: ['UtilityPayment', 'FinancialTransaction', 'DocumentRequest']
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: error.stack
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
// Cleanup orphaned utility payment records
const cleanupOrphanedPayments = async (req, res) => {
  try {
    console.log('=== CLEANUP ORPHANED PAYMENTS ===');
    
    // Find all utility payments and check their validity
    const allUtilityPayments = await UtilityPayment.find({})
      .populate('household', 'headOfHousehold address houseNumber');
    console.log('Total utility payment records found:', allUtilityPayments.length);
    
    // Get current totals before cleanup
    const currentTotals = await UtilityPayment.aggregate([
      { $match: {} },
      { $group: {
        _id: '$type',
        totalAmount: { $sum: '$amountPaid' },
        count: { $sum: 1 }
      }}
    ]);
    
    console.log('Current totals by type:', currentTotals);
    
    // Find truly orphaned payments with multiple criteria
    const orphanedPayments = [];
    const currentYear = new Date().getFullYear();
    
    for (const payment of allUtilityPayments) {
      let shouldDelete = false;
      let reason = '';
      
      // Check if household reference is missing or invalid
      if (!payment.household) {
        shouldDelete = true;
        reason = 'No household reference';
      }
      // Check if payments array is empty or missing
      else if (!payment.payments || payment.payments.length === 0) {
        shouldDelete = true;
        reason = 'Empty payments array';
      }
      // Check if amount paid is zero or negative
      else if (!payment.amountPaid || payment.amountPaid <= 0) {
        shouldDelete = true;
        reason = 'Zero or negative amount';
      }
      // Check if this is from a previous year (likely old data)
      else if (new Date(payment.createdAt).getFullYear() < currentYear) {
        shouldDelete = true;
        reason = 'Previous year data';
      }
      // Check if this payment record has inconsistent data
      else if (payment.payments.length > 0 && payment.amountPaid === 0) {
        shouldDelete = true;
        reason = 'Inconsistent payment data';
      }
      
      if (shouldDelete) {
        orphanedPayments.push({
          ...payment.toObject(),
          deleteReason: reason
        });
        
        console.log('Flagged for deletion:', {
          id: payment._id,
          type: payment.type,
          month: payment.month,
          year: new Date(payment.createdAt).getFullYear(),
          amountPaid: payment.amountPaid,
          paymentsCount: payment.payments?.length || 0,
          household: payment.household?._id || 'Missing',
          reason: reason
        });
      }
    }
    
    console.log('Found orphaned payment records:', orphanedPayments.length);
    
    let deletedCount = 0;
    if (orphanedPayments.length > 0) {
      // Delete orphaned records by ID
      const orphanedIds = orphanedPayments.map(p => p._id);
      const result = await UtilityPayment.deleteMany({
        _id: { $in: orphanedIds }
      });
      
      deletedCount = result.deletedCount;
      console.log('Deleted orphaned records:', deletedCount);
      
      // Show breakdown by deletion reason
      const deletionBreakdown = {};
      orphanedPayments.forEach(p => {
        deletionBreakdown[p.deleteReason] = (deletionBreakdown[p.deleteReason] || 0) + 1;
      });
      
      console.log('Deletion breakdown by reason:', deletionBreakdown);
      
      res.json({
        message: `Cleaned up ${deletedCount} orphaned payment records`,
        deletedCount: deletedCount,
        deletionBreakdown: deletionBreakdown,
        beforeCleanup: currentTotals,
        deletedRecords: orphanedPayments.map(p => ({
          id: p._id,
          type: p.type,
          month: p.month,
          amountPaid: p.amountPaid,
          reason: p.deleteReason
        }))
      });
    } else {
      res.json({
        message: 'No orphaned payment records found',
        deletedCount: 0,
        currentTotals: currentTotals
      });
    }
    
  } catch (error) {
    console.error('Error cleaning up orphaned payments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Clean up old transactions (keep only latest/current day transactions)
const cleanupOldTransactions = async (req, res) => {
  try {
    console.log('=== CLEANUP OLD TRANSACTIONS ===');
    
    // Get current date (today)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log('Today start:', todayStart);
    console.log('Keeping transactions from:', todayStart.toISOString());
    
    // Find all utility payments
    const allUtilityPayments = await UtilityPayment.find({})
      .populate('household', 'headOfHousehold address houseNumber');
    
    console.log('Total utility payment records found:', allUtilityPayments.length);
    
    // Separate current and old payments
    const oldPayments = [];
    const currentPayments = [];
    
    for (const payment of allUtilityPayments) {
      const paymentDate = new Date(payment.createdAt);
      const isOld = paymentDate < todayStart;
      
      if (isOld) {
        oldPayments.push(payment);
        console.log('OLD payment:', {
          id: payment._id,
          type: payment.type,
          month: payment.month,
          createdAt: paymentDate.toISOString(),
          amountPaid: payment.amountPaid,
          paymentsCount: payment.payments?.length || 0
        });
      } else {
        currentPayments.push(payment);
        console.log('CURRENT payment:', {
          id: payment._id,
          type: payment.type,
          month: payment.month,
          createdAt: paymentDate.toISOString(),
          amountPaid: payment.amountPaid,
          paymentsCount: payment.payments?.length || 0
        });
      }
    }
    
    console.log('Old payments to delete:', oldPayments.length);
    console.log('Current payments to keep:', currentPayments.length);
    
    // Calculate totals before cleanup
    const oldTotal = oldPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const currentTotal = currentPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    console.log('Old payments total amount:', oldTotal);
    console.log('Current payments total amount:', currentTotal);
    
    // Delete old payments
    let deletedCount = 0;
    if (oldPayments.length > 0) {
      const oldPaymentIds = oldPayments.map(p => p._id);
      const deleteResult = await UtilityPayment.deleteMany({
        _id: { $in: oldPaymentIds }
      });
      
      deletedCount = deleteResult.deletedCount;
      console.log('✓ Deleted old payment records:', deletedCount);
    }
    
    // Also clean up old regular financial transactions if any
    const oldRegularTransactions = await FinancialTransaction.find({
      createdAt: { $lt: todayStart }
    });
    
    console.log('Old regular transactions found:', oldRegularTransactions.length);
    
    let deletedRegularCount = 0;
    if (oldRegularTransactions.length > 0) {
      const deleteRegularResult = await FinancialTransaction.deleteMany({
        createdAt: { $lt: todayStart }
      });
      deletedRegularCount = deleteRegularResult.deletedCount;
      console.log('✓ Deleted old regular transactions:', deletedRegularCount);
    }
    
    res.json({
      success: true,
      message: `Cleaned up old transaction data. Removed ${deletedCount} utility payments and ${deletedRegularCount} regular transactions`,
      summary: {
        utilityPayments: {
          oldDeleted: deletedCount,
          currentKept: currentPayments.length,
          oldTotalAmount: oldTotal,
          currentTotalAmount: currentTotal
        },
        regularTransactions: {
          oldDeleted: deletedRegularCount
        },
        cutoffDate: todayStart.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error cleaning up old transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
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
};

// Additional cleanup function for resetting all utility payment data
const resetAllUtilityPayments = async (req, res) => {
  try {
    console.log('=== RESET ALL UTILITY PAYMENTS ===');
    
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
};