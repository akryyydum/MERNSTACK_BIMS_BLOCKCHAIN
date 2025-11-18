const DocumentRequest = require('../models/document.model');
const Resident = require('../models/resident.model');
const Household = require('../models/household.model');
const FinancialTransaction = require('../models/financialTransaction.model');
const mongoose = require('mongoose');
const { validateResidentPaymentStatus } = require('../utils/paymentValidation');
const Settings = require('../models/settings.model');
// Fabric client for blockchain mirroring
const { getContract } = require('../utils/fabricClient');

exports.list = async (req, res) => {
  try {
    const resident = await Resident.findOne({ user: req.user.id }).select('_id').lean();
    if (!resident) return res.status(404).json({ message: "Resident profile not found" });

    const requests = await DocumentRequest.find({
      $or: [{ residentId: resident._id }, { requestedBy: resident._id }]
    })
      .populate('residentId', 'firstName lastName')
      .populate('requestedBy', 'firstName lastName')
      .populate('requestFor', 'firstName lastName')
      .sort({ requestedAt: -1 })
      .lean();

    res.json(requests);
  } catch (error) {
    console.error("Error in resident document request list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createRequest = async (req, res) => {
  try {
    // find the resident doc linked to the authenticated user
    const resident = await Resident.findOne({ user: req.user.id });
    if (!resident) return res.status(404).json({ message: "Resident profile not found" });

    // Check if resident is part of a household
    const household = await Household.findOne({
      $or: [
        { headOfHousehold: resident._id },
        { members: resident._id }
      ]
    });
    
    if (!household) {
      return res.status(403).json({ 
        message: "Cannot request documents. You must be part of a household first.",
        reason: "NOT_IN_HOUSEHOLD"
      });
    }

    // Validate payment status before allowing document request
    try {
      const paymentValidation = await validateResidentPaymentStatus(resident._id);
      if (!paymentValidation.isValid) {
        return res.status(400).json({ 
          message: "Cannot request documents due to outstanding payments",
          paymentStatus: paymentValidation.paymentStatus,
          details: paymentValidation.message
        });
      }
    } catch (paymentError) {
      console.error('Payment validation error:', paymentError);
      return res.status(500).json({ 
        message: "Unable to validate payment status at this time",
        error: paymentError.message 
      });
    }

    const { documentType, purpose, businessName, quantity, amount, requestFor } = req.body;

    if (!documentType) {
      return res.status(400).json({ message: 'Document type is required' });
    }
    if (documentType === 'Business Clearance' && !businessName) {
      return res.status(400).json({ message: 'Business name is required for Business Clearance' });
    }

    // Validate requestFor - if not provided, default to the resident themselves
    const requestForResident = requestFor || resident._id;
    
    // Validate that requestFor is a valid ObjectId if provided
    if (requestFor && !mongoose.Types.ObjectId.isValid(requestFor)) {
      return res.status(400).json({ message: 'Invalid requestFor ID' });
    }

    const doc = await DocumentRequest.create({
      residentId: resident._id,     // The resident making the request
      requestedBy: resident._id,    // Who made the request (same as residentId)
      requestFor: requestForResident, // Who the document is for
      documentType,
      purpose,
      businessName,
      quantity: Math.max(Number(quantity || 1), 1),
      amount: Number(amount || 0)   // Document fee
    });
    
    // Create financial transaction for the document request
    try {
      const qty = Math.max(Number(quantity || 1), 1);
      const type = documentType;
      let unitAmount = 0;
      const settings = await Settings.getSingleton();
      const indigencyFee = settings.documentFees?.indigency ?? 0;
      const clearanceFee = settings.documentFees?.barangayClearance ?? 100;
      if (type === 'Indigency') unitAmount = indigencyFee;
      else if (type === 'Barangay Clearance') unitAmount = clearanceFee;
      else if (type === 'Business Clearance') unitAmount = Number(amount || 0);

      const total = unitAmount * qty;
      
      // Get the subject resident (who the document is for) for reporting
      let subjectResident;
      try {
        subjectResident = await Resident.findById(requestForResident).select('firstName lastName').lean();
      } catch (_) {}
      
      const subjectResidentName = subjectResident 
        ? `${subjectResident.firstName} ${subjectResident.lastName}`
        : `${resident.firstName} ${resident.lastName}`;

      // Create financial transaction (even for $0 amounts for audit trail)
      await FinancialTransaction.create({
        type: 'document_fee',
        category: 'revenue',
        description: `${type} x ${qty}`,
        amount: Number(total) || 0,
        residentId: requestForResident,
        residentName: subjectResidentName,
        documentRequestId: doc._id,
        status: 'completed',
        transactionDate: new Date(),
        paymentMethod: 'cash',
        createdBy: resident.user,
        updatedBy: resident.user,
      });
      
      console.log(`Financial transaction created for resident document request: ${type} x ${qty} = ₱${total}`);
    } catch (txErr) {
      console.error('Error creating financial transaction for resident document request:', txErr.message);
      // Non-fatal: continue with document creation
    }
    
    // Attempt to mirror to blockchain (non-blocking for speed)
    const docId = doc._id.toString();
    setImmediate(async () => {
      try {
        const { gateway, contract } = await getContract();
        // Determine the subject (who the document is for) for display on-chain
        let subjectResident;
        try {
          subjectResident = await Resident.findById(doc.requestFor).select('firstName lastName').lean();
        } catch (_) {}
        try {
          await contract.submitTransaction(
            'createRequest',
            docId,
            (doc.requestFor?._id || doc.requestFor).toString(),
            subjectResident ? [subjectResident.firstName, subjectResident.lastName].filter(Boolean).join(' ') : [resident.firstName, resident.lastName].filter(Boolean).join(' '),
            documentType,
            purpose || '',
            doc.status || 'pending'
          );
        } catch (chainErr) {
          console.error('Blockchain createRequest (resident) failed:', chainErr.message || chainErr);
        }
        await gateway.disconnect();
      } catch (fabricErr) {
        console.warn('Fabric gateway error (resident create mirror):', fabricErr.message || fabricErr);
      }
    });

    // Return populated document for frontend consistency (optimized with select)
    const populated = await DocumentRequest.findById(doc._id)
      .populate('residentId', 'firstName lastName')
      .populate('requestedBy', 'firstName lastName')
      .populate('requestFor', 'firstName lastName')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating document request:', error);
    res.status(500).json({ message: error.message || 'Failed to create document request' });
  }
};

exports.getById = async (req, res) => {
  try {
    const requestId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const resident = await Resident.findOne({ user: req.user.id });
    if (!resident) return res.status(404).json({ message: "Resident profile not found" });

    const request = await DocumentRequest.findById(requestId)
      .populate('residentId')
      .populate('requestedBy')
      .populate('requestFor');

    if (!request) return res.status(404).json({ message: "Document request not found" });

    const residentOid = resident._id.toString();
    const subjectId = (request.residentId?._id || request.residentId)?.toString?.();
    const requesterId = (request.requestedBy?._id || request.requestedBy)?.toString?.();

    if (subjectId !== residentOid && requesterId !== residentOid) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(request);
  } catch (error) {
    console.error("Error getting document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStats = async (req, res) => {
  try {
    const resident = await Resident.findOne({ user: req.user.id });
    if (!resident) return res.status(404).json({ message: "Resident profile not found" });

    const requests = await DocumentRequest.find({
      $or: [{ residentId: resident._id }, { requestedBy: resident._id }]
    });

    const stats = {
      total: requests.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      released: 0
    };

    requests.forEach(req => {
      if (req.status === 'pending') stats.pending++;
      else if (req.status === 'accepted') stats.approved++;
      else if (req.status === 'declined') stats.rejected++;
      else if (req.status === 'completed') stats.released++;
    });

    res.json(stats);
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// New endpoint to check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    console.log("=== PAYMENT STATUS CHECK ===");
    console.log("User ID from token:", req.user.id);
    
    const resident = await Resident.findOne({ user: req.user.id });
    console.log("Found resident:", resident ? `${resident._id} - ${resident.firstName} ${resident.lastName}` : "null");
    
    if (!resident) return res.status(404).json({ message: "Resident profile not found" });

    // Check if there are any households in the database
    const totalHouseholds = await require('../models/household.model').countDocuments();
    console.log("Total households in database:", totalHouseholds);
    
    const paymentValidation = await validateResidentPaymentStatus(resident._id);
    console.log("Payment validation result:", paymentValidation);
    
    res.json({
      canRequestDocuments: paymentValidation.isValid,
      resident: paymentValidation.resident,
      paymentStatus: paymentValidation.paymentStatus,
      message: paymentValidation.message
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    console.error("Error stack:", error.stack);
    res.status(400).json({ message: "Unable to check payment status", error: error.message });
  }
};
