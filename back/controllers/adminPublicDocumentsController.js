const fs = require("fs");
const path = require("path");
const PublicDocument = require("../models/publicdocs.model");
const { submitPublicDocumentToFabric, getAllPublicDocumentsFromFabric } = require("../utils/publicDocFabric");

exports.listAdmin = async (req, res) => {
  try {
    const mongoDocs = await PublicDocument.find().sort({ createdAt: -1 });

    // optional blockchain merge
    const blockchainDocs = await getAllPublicDocumentsFromFabric();

    res.json({
      mongoDocs,
      blockchainDocs,
      total: mongoDocs.length,
      blockchainCount: blockchainDocs.length
    });
  } catch (err) {
    console.error("Error listing public docs:", err);
    res.status(500).json({ message: "Failed to fetch public documents" });
  }
};


exports.listPublic = async (_req, res) => {
  try {
    const docs = await PublicDocument.find({ visibility: "public" }).sort({
      createdAt: -1,
    });
    res.json(docs);
  } catch {
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};
exports.create = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File is required" });

    const doc = new PublicDocument({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || "General",
      originalName: file.originalname,
      storedFilename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: req.user.id,
    });

    await doc.save();

    // 🔗 Mirror to Hyperledger Fabric
    const fabricResult = await submitPublicDocumentToFabric(doc);
    if (fabricResult.ok) {
      console.log("Public doc recorded on Fabric:", fabricResult.result);
    } else {
      console.warn("Fabric mirror failed:", fabricResult.error);
    }

    res.status(201).json({ message: "Document uploaded successfully", doc });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
exports.remove = async (req, res) => {
  try {
    const doc = await PublicDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    // Optionally restrict who can delete (admin only already enforced)
    if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
    await doc.deleteOne();
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

exports.download = async (req, res) => {
  try {
    const doc = await PublicDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (!fs.existsSync(doc.path)) return res.status(410).json({ message: "File missing" });
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(doc.originalName)}"`
    );
    fs.createReadStream(doc.path).pipe(res);
  } catch {
    res.status(500).json({ message: "Download failed" });
  }
};

// NEW: inline preview (no attachment header)
exports.preview = async (req, res) => {
  try {
    const doc = await PublicDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (!fs.existsSync(doc.path)) return res.status(410).json({ message: "File missing" });
    res.setHeader("Content-Type", doc.mimeType);
    // Inline; many browsers will render pdf/image
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.originalName)}"`
    );
    fs.createReadStream(doc.path).pipe(res);
  } catch {
    res.status(500).json({ message: "Preview failed" });
  }
};