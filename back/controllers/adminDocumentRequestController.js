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
      .sort({ requestedAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error in admin document request list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve a document request
exports.approve = async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await DocumentRequest.findByIdAndUpdate(
      id,
      { 
        status: 'accepted',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('residentId').populate('requestedBy');

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
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
    ).populate('residentId').populate('requestedBy');

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
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

    res.json({ message: "Document request deleted successfully" });
  } catch (error) {
    console.error("Error deleting document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new document request (admin can create on behalf of residents)
exports.create = async (req, res) => {
  try {
    const { residentId, documentType, purpose, businessName } = req.body;

    const resident = await Resident.findById(residentId);
    if (!resident) {
      return res.status(404).json({ message: "Resident not found" });
    }

    // 1️⃣ Save to MongoDB first
    const newRequest = new DocumentRequest({
      residentId,
      requestedBy: residentId,
      documentType,
      purpose,
      businessName,
      status: 'pending'
    });
    await newRequest.save();

    // 2️⃣ Save to blockchain
    const { gateway, contract } = await getContract(); // <-- get both gateway & contract
    await contract.submitTransaction(
      'createRequest',
      newRequest._id.toString(),
      residentId.toString(),
      `${resident.firstName} ${resident.lastName}`,
      documentType,
      purpose,
      'pending'
    );
    await gateway.disconnect(); // <-- cleanly close the gateway connection ✅

    // 3️⃣ Respond with populated MongoDB entry
    const populatedRequest = await DocumentRequest.findById(newRequest._id)
      .populate('residentId')
      .populate('requestedBy');

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
    ).populate('residentId').populate('requestedBy');

    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
    }

    res.json(request);
  } catch (error) {
    console.error("Error completing document request:", error);
    res.status(500).json({ message: "Server error" });
  }
};