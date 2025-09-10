const DocumentRequest = require('../models/document.model');
const Resident = require('../models/resident.model');
const mongoose = require('mongoose');

exports.list = async (req, res) => {
  try {
    // Find the resident ID associated with the current user
    const resident = await Resident.findOne({ user: req.user.id });
    
    if (!resident) {
      return res.status(404).json({ message: "Resident profile not found" });
    }
    
    // Find document requests where the resident is either the subject or the requester
    const requests = await DocumentRequest.find({
      $or: [
        { residentId: resident._id },
        { requestedBy: resident._id }
      ]
    }).populate('residentId').sort({ requestedAt: -1 });
    
    res.json(requests);
  } catch (error) {
    console.error("Error in resident document request list:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createRequest = async (req, res) => {
    try {
        const { residentId, requestedBy, documentType, purpose } = req.body;
        if (!residentId || !requestedBy || !documentType || !purpose) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        // Check if residentId and requestedBy exist
        const residentDoc = await Resident.findById(residentId);
        const requesterDoc = await Resident.findById(requestedBy);
        if (!residentDoc || !requesterDoc) {
            return res.status(400).json({ message: 'Resident or requester not found.' });
        }
        const request = new DocumentRequest({
            residentId,
            requestedBy,
            documentType,
            purpose,
            status: 'pending', // <-- lowercase
            requestedAt: new Date(),
            updatedAt: new Date()
        });
        await request.save();
        res.status(201).json(request);
    } catch (err) {
        console.error('Error creating document request:', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getById = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    
    const resident = await Resident.findOne({ user: req.user.id });
    
    if (!resident) {
      return res.status(404).json({ message: "Resident profile not found" });
    }
    
    const request = await DocumentRequest.findById(requestId)
      .populate('residentId');
    
    if (!request) {
      return res.status(404).json({ message: "Document request not found" });
    }
    
    // Check if the request belongs to the current user
    if (
      !request.residentId.equals(resident._id) &&
      !request.requestedBy.equals(resident._id)
    ) {
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
    
    if (!resident) {
      return res.status(404).json({ message: "Resident profile not found" });
    }
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      released: 0
    };
    
    // Get all requests for this resident
    const requests = await DocumentRequest.find({
      $or: [
        { residentId: resident._id },
        { requestedBy: resident._id }
      ]
    });
    
    stats.total = requests.length;
    
    // Count by status
    requests.forEach(request => {
      if (request.status === 'PENDING') stats.pending++;
      else if (request.status === 'APPROVED') stats.approved++;
      else if (request.status === 'REJECTED') stats.rejected++;
      else if (request.status === 'RELEASED') stats.released++;
    });
    
    res.json(stats);
  } catch (error) {
    console.error("Error getting document request stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
