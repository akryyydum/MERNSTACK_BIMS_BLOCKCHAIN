const DocumentRequest = require('../models/document.model');
const Resident = require('../models/resident.model');
const mongoose = require('mongoose');
const { getContract } = require('../utils/fabricClient');


// List all document requests for admin
exports.list = async (req, res) => {
  try {
    const requests = await DocumentRequest.find({})
      .populate('residentId')
      .populate('requestedBy')
      .populate('requestFor')  // Add this line to populate who the document is for
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error in admin document request list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const FinancialTransaction = require('../models/financialTransaction.model');
const { submitFinancialTransactionToFabric } = require('../utils/financialFabric');

// Approve a document request (and log financial transaction)
exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body || {};
    
    const request = await DocumentRequest.findByIdAndUpdate(
      id,
      { 
        status: 'accepted',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('residentId').populate('requestedBy').populate('requestFor');

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
    }

    // Compute document fees and record financial transaction
    try {
      const qty = Math.max(Number(request.quantity || 1), 1);
      const type = request.documentType;
      let unitAmount = 0;
      if (type === 'Indigency') unitAmount = 0;
      else if (type === 'Barangay Clearance') unitAmount = 100;
      else if (type === 'Business Clearance') unitAmount = Number(amount || request.feeAmount || 0);

      // Save feeAmount chosen by admin when provided
      if (type === 'Business Clearance' && (amount !== undefined)) {
        await DocumentRequest.findByIdAndUpdate(id, { feeAmount: unitAmount });
      }

      const total = unitAmount * qty;
      // Only create a transaction if total known (>=0). For 0, we can still log for audit
      const createdTx = await FinancialTransaction.create({
        type: 'document_fee',
        category: 'revenue',
        description: `${type} x ${qty}`,
        amount: Number(total) || 0,
        residentId: request.residentId?._id || request.requestedBy?._id,
        documentRequestId: request._id,
        status: 'completed',
        transactionDate: new Date(),
        paymentMethod: 'cash',
        createdBy: req.user?.id || req.user?._id,
        updatedBy: req.user?.id || req.user?._id,
      });

      // Attempt to submit financial transaction to Fabric (non-blocking for main flow)
      try {
        const result = await submitFinancialTransactionToFabric(createdTx);
        if (!result.ok) console.warn('Fabric submit returned error:', result.error);
      } catch (fbErr) {
        console.error('Error submitting document fee transaction to Fabric:', fbErr.message || fbErr);
      }
    } catch (txErr) {
      console.error('Error creating financial transaction for document request:', txErr.message);
      // Non-fatal: proceed to respond with the accepted request
    }

    // Mirror to blockchain: set status accepted (fallback create if missing)
    try {
      const { gateway, contract } = await getContract();
      try {
        await contract.submitTransaction('updateStatus', request._id.toString(), 'accepted');
      } catch (chainErr) {
        if (/does not exist/i.test(chainErr.message)) {
          // attempt to create then update
          try {
            await contract.submitTransaction(
              'createRequest',
              request._id.toString(),
              (request.residentId?._id || request.residentId || '').toString(),
              // requestedBy full name fallback
              [request.requestedBy?.firstName, request.requestedBy?.lastName].filter(Boolean).join(' ') || 'Unknown',
              request.documentType || '',
              request.purpose || '',
              request.status || 'accepted'
            );
            await contract.submitTransaction('updateStatus', request._id.toString(), 'accepted');
          } catch (createErr) {
            console.warn('Blockchain create+update (accepted) failed:', createErr.message);
          }
        } else {
          console.warn('Blockchain updateStatus(accepted) failed:', chainErr.message);
        }
      }
      await gateway.disconnect();
    } catch (fabricErr) {
      console.warn('Fabric gateway error (approve mirror):', fabricErr.message);
    }

    res.json(request);
  } catch (error) {
    console.error("Error approving document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Deny a document request
exports.deny = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await DocumentRequest.findByIdAndUpdate(
      id,
      { 
        status: 'declined',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('residentId').populate('requestedBy').populate('requestFor');

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
    }

    // Mirror decline to blockchain
    try {
      const { gateway, contract } = await getContract();
      try {
        await contract.submitTransaction('updateStatus', request._id.toString(), 'declined');
      } catch (chainErr) {
        if (/does not exist/i.test(chainErr.message)) {
          try {
            await contract.submitTransaction(
              'createRequest',
              request._id.toString(),
              (request.residentId?._id || request.residentId || '').toString(),
              [request.requestedBy?.firstName, request.requestedBy?.lastName].filter(Boolean).join(' ') || 'Unknown',
              request.documentType || '',
              request.purpose || '',
              'declined'
            );
          } catch (createErr) {
            console.warn('Blockchain create(declined) failed:', createErr.message);
          }
        } else {
          console.warn('Blockchain updateStatus(declined) failed:', chainErr.message);
        }
      }
      await gateway.disconnect();
    } catch (fabricErr) {
      console.warn('Fabric gateway error (deny mirror):', fabricErr.message);
    }

    res.json(request);
  } catch (error) {
    console.error("Error denying document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a document request
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await DocumentRequest.findByIdAndDelete(id);

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
    }
    // Mirror deletion by setting status 'deleted'
    try {
      const { gateway, contract } = await getContract();
      try {
        await contract.submitTransaction('updateStatus', id.toString(), 'deleted');
      } catch (chainErr) {
        if (/does not exist/i.test(chainErr.message)) {
          // create with deleted status (historic trace)
          try {
            await contract.submitTransaction(
              'createRequest',
              id.toString(),
              (request.residentId?._id || request.residentId || '').toString(),
              [request.requestedBy?.firstName, request.requestedBy?.lastName].filter(Boolean).join(' ') || 'Unknown',
              request.documentType || '',
              request.purpose || '',
              'deleted'
            );
          } catch (createErr) {
            console.warn('Blockchain create(deleted) failed:', createErr.message);
          }
        } else {
          console.warn('Blockchain updateStatus(deleted) failed:', chainErr.message);
        }
      }
      await gateway.disconnect();
    } catch (fabricErr) {
      console.warn('Fabric gateway error (delete mirror):', fabricErr.message);
    }

    res.json({ message: "Document request deleted successfully" });
  } catch (error) {
    console.error("Error deleting document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new document request (admin can create on behalf of residents)
exports.create = async (req, res) => {
  try {
    console.log("Admin create request - received data:", req.body);
    
    const { requestedBy, requestFor, documentType, purpose, businessName, quantity, amount } = req.body;

    // Validate required fields
    if (!requestedBy) {
      return res.status(400).json({ message: "requestedBy is required" });
    }
    if (!requestFor) {
      return res.status(400).json({ message: "requestFor is required" });
    }
    if (!documentType) {
      return res.status(400).json({ message: "documentType is required" });
    }

    // Validate that both requestedBy and requestFor exist
    const requesterResident = await Resident.findById(requestedBy);
    if (!requesterResident) {
      console.log("Requester not found:", requestedBy);
      return res.status(404).json({ message: "Requester resident not found" });
    }

    const forResident = await Resident.findById(requestFor);
    if (!forResident) {
      console.log("RequestFor resident not found:", requestFor);
      return res.status(404).json({ message: "RequestFor resident not found" });
    }

    console.log("Found requester:", requesterResident.firstName, requesterResident.lastName);
    console.log("Found document for:", forResident.firstName, forResident.lastName);

    // Calculate amount if not provided
    let documentAmount = Number(amount || 0);
    if (!amount) {
      if (documentType === 'Indigency') documentAmount = 0;
      else if (documentType === 'Barangay Clearance') documentAmount = 100;
      else if (documentType === 'Business Clearance') documentAmount = 0; // Set by admin later
    }

    // 1️⃣ Save to MongoDB first
    const newRequest = new DocumentRequest({
      residentId: requestedBy,  // Keep for backward compatibility
      requestedBy: requestedBy, // Who made the request
      requestFor: requestFor,   // Who the document is for
      documentType,
      purpose,
      businessName,
      quantity: Math.max(Number(quantity || 1), 1),
      amount: documentAmount,
      status: 'pending'
    });
    
    console.log("About to save new request:", newRequest);
    await newRequest.save();
    console.log("Request saved successfully with ID:", newRequest._id);

    // 2️⃣ Save to blockchain (with error handling)
    try {
      const { gateway, contract } = await getContract(); // <-- get both gateway & contract
      await contract.submitTransaction(
        'createRequest',
        newRequest._id.toString(),
        requestFor.toString(), // Use requestFor for blockchain (document recipient)
        `${forResident.firstName} ${forResident.lastName}`,
        documentType,
        purpose,
        'pending'
      );
      await gateway.disconnect(); // <-- cleanly close the gateway connection ✅
      console.log("Request saved to blockchain successfully");
    } catch (blockchainError) {
      console.error("Blockchain save failed (continuing anyway):", blockchainError.message);
      // Continue - the MongoDB save was successful
    }

    // 3️⃣ Respond with populated MongoDB entry
    const populatedRequest = await DocumentRequest.findById(newRequest._id)
      .populate('residentId')
      .populate('requestedBy')
      .populate('requestFor');

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error("Error creating document request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Accept a document request (alias for approve)
exports.acceptRequest = async (req, res) => {
  return exports.approve(req, res);
};

// Decline a document request (alias for deny)
exports.declineRequest = async (req, res) => {
  return exports.deny(req, res);
};

// Complete a document request
exports.completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { blockchainHash, txId } = req.body;
    
    const updateData = { 
      status: 'completed',
      updatedAt: new Date()
    };

    // Add blockchain data if provided
    if (blockchainHash || txId) {
      updateData.blockchain = {
        hash: blockchainHash,
        lastTxId: txId,
        issuedBy: req.user.username || 'Admin',
        issuedAt: new Date()
      };
    }

    const request = await DocumentRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('residentId').populate('requestedBy').populate('requestFor');

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
    }

    // Mirror completion on-chain
    try {
      const { gateway, contract } = await getContract();
      try {
        await contract.submitTransaction('updateStatus', request._id.toString(), 'completed');
      } catch (chainErr) {
        if (/does not exist/i.test(chainErr.message)) {
          try {
            await contract.submitTransaction(
              'createRequest',
              request._id.toString(),
              (request.residentId?._id || request.residentId || '').toString(),
              [request.requestedBy?.firstName, request.requestedBy?.lastName].filter(Boolean).join(' ') || 'Unknown',
              request.documentType || '',
              request.purpose || '',
              'completed'
            );
          } catch (createErr) {
            console.warn('Blockchain create(completed) failed:', createErr.message);
          }
        } else {
          console.warn('Blockchain updateStatus(completed) failed:', chainErr.message);
        }
      }
      await gateway.disconnect();
    } catch (fabricErr) {
      console.warn('Fabric gateway error (complete mirror):', fabricErr.message);
    }

    res.json(request);
  } catch (error) {
    console.error("Error completing document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};