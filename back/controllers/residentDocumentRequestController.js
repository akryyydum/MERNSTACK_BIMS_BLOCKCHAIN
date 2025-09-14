const DocumentRequest = require('../models/document.model');
const Resident = require('../models/resident.model');
const mongoose = require('mongoose');

exports.list = async (req, res) => {
  try {
    const resident = await Resident.findOne({ user: req.user.id });
    if (!resident) return res.status(404).json({ message: "Resident profile not found" });

    const requests = await DocumentRequest.find({
      $or: [{ residentId: resident._id }, { requestedBy: resident._id }]
    })
      .populate('residentId')
      .populate('requestedBy') // include requester info
      .sort({ requestedAt: -1 });

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

    const { documentType, purpose, businessName } = req.body;

    if (!documentType) {
      return res.status(400).json({ message: 'Document type is required' });
    }
    if (documentType === 'Business Clearance' && !businessName) {
      return res.status(400).json({ message: 'Business name is required for Business Clearance' });
    }

    const doc = await DocumentRequest.create({
      residentId: resident._id,     // use Resident _id
      requestedBy: resident._id,    // requester is also the resident
      documentType,
      purpose,
      businessName
    });

    res.status(201).json(doc);
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
      .populate('requestedBy');

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

    requests.forEach(r => {
      if (r.status === 'pending') stats.pending++;
      else if (r.status === 'accepted') stats.approved++;
      else if (r.status === 'declined') stats.rejected++;
      else if (r.status === 'completed') stats.released++;
    });

    res.json(stats);
  } catch (error) {
    console.error("Error getting document request stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
