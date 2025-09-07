const Document = require('../models/document.model');

exports.list = async (req, res) => {
    try {
        const docs = await Document.find()
        .populate("residentId")
        .populate("requestedBy")
        .sort({ createdAt: -1 });
        res.json(docs);
    } catch (error) {
        console.error("Error fetching document requests:", error);
        res.status(500).json({ message: "Failed to load document requests." });
    }
};

exports.approve = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await Document.findById(id);
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
        const doc = await Document.findById(id);
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
        const doc = await Document.findByIdAndDelete(id);
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
        const doc = await Document.create(req.body);
        res.status(201).json(doc);
    } catch (error) {
        console.error("Error creating document request:", error);
        res.status(500).json({ message: "Failed to create document request." });
    }
};