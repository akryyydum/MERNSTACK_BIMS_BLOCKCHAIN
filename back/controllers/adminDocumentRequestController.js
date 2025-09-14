const DocumentRequest = require('../models/document.model');
const sendEmail = require('../utils/sendEmail');

exports.list = async (req, res) => {
  try {
    const docs = await DocumentRequest.find()
      .populate("residentId")
      .populate("requestedBy")
      .sort({ requestedAt: -1 }); // sort by requestedAt (createdAt not present)
    res.json(docs);
  } catch (error) {
    console.error("Error fetching document requests:", error);
    res.status(500).json({ message: "Failed to load document requests." });
  }
};

exports.approve = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await DocumentRequest.findById(id);
        if (!doc) {
            return res.status(404).json({ message: "Document request not found." });
        }
        doc.status = "Approved";
        await doc.save();
        res.json({ message: "Document request approved." });
    } catch (error) {
        console.error("Error approving document request:", error);
        res.status(500).json({ message: "Failed to approve document request." });
    }
};

exports.deny = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await DocumentRequest.findById(id);
        if (!doc) {
            return res.status(404).json({ message: "Document request not found." });
        }
        doc.status = "Denied";
        await doc.save();
        res.json({ message: "Document request denied." });
    } catch (error) {
        console.error("Error denying document request:", error);
        res.status(500).json({ message: "Failed to deny document request." });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await DocumentRequest.findByIdAndDelete(id);
        if (!doc) {
            return res.status(404).json({ message: "Document request not found." });
        }
        res.json({ message: "Document request deleted." });
    } catch (error) {
        console.error("Error deleting document request:", error);
        res.status(500).json({ message: "Failed to delete document request." });
    }
};

exports.create = async (req, res) => {
    try {
        const doc = await DocumentRequest.create(req.body);
        res.status(201).json(doc);
    } catch (error) {
        console.error("Error creating document request:", error);
        res.status(500).json({ message: "Failed to create document request." });
    }
};

exports.acceptRequest = async (req, res) => {
    try {
        const request = await DocumentRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        request.status = 'accepted';
        await request.save();
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.declineRequest = async (req, res) => {
    try {
        const request = await DocumentRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        request.status = 'declined';
        await request.save();
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.completeRequest = async (req, res) => {
  try {
    const request = await DocumentRequest.findById(req.params.id).populate('residentId');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    request.status = 'completed';
    await request.save();
    if (request.residentId?.contact?.email) {
      await sendEmail(request.residentId.contact.email, 'Document Request Completed', 'Your document request has been completed.');
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};