const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PublicDocument = require("../models/publicdocs.model");

const {
  submitPublicDocumentToFabric,
  getAllPublicDocumentsFromFabric
} = require("../utils/publicDocFabric");

const { getContract } = require("../utils/fabricClient");

// ---------------------------------------------
// LIST FOR ADMIN
// ---------------------------------------------
exports.listAdmin = async (req, res) => {
  try {
    const mongoDocs = await PublicDocument.find().sort({ createdAt: -1 });

    let blockchainDocs = [];
    try {
      blockchainDocs = await getAllPublicDocumentsFromFabric();
    } catch (err) {
      console.warn("Fabric offline, skipping blockchain docs");
    }

    res.json({
      mongoDocs,
      blockchainDocs,
      total: mongoDocs.length,
      blockchainCount: blockchainDocs.length,
    });
  } catch (err) {
    console.error("Error listing public docs:", err);
    res.status(500).json({ message: "Failed to fetch public documents" });
  }
};

// ---------------------------------------------
// VERIFY DOCUMENT INTEGRITY
// ---------------------------------------------
exports.verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PublicDocument.findById(id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Compute hash of stored file
    const fileBuffer = fs.readFileSync(doc.path);
    const newHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const { contract } = await getContract();
    const resultBytes = await contract.evaluateTransaction(
      "verifyDocument",
      doc.docId || doc._id.toString(),
      newHash
    );

    const result = JSON.parse(resultBytes.toString());
    res.json(result);
  } catch (err) {
    console.error("Verify integrity error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};

// ---------------------------------------------
// PUBLIC LIST (RESIDENT SIDE)
// ---------------------------------------------
exports.listPublic = async (_req, res) => {
  try {
    const docs = await PublicDocument.find({ visibility: "public" })
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch {
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

// ---------------------------------------------
// CREATE DOCUMENT + HASH + FABRIC SUBMIT
// ---------------------------------------------
exports.create = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File is required" });

    // Compute SHA-256 hash of uploaded file
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const doc = new PublicDocument({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || "General",
      originalName: file.originalname,
      storedFilename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      fileHash,        // STORE HASH IN MONGO TOO
      uploadedBy: req.user.id,
    });

    await doc.save();

    // Send to blockchain
    const fabricResult = await submitPublicDocumentToFabric(doc, fileHash);

    res.status(201).json({
      message: "Document uploaded successfully",
      doc,
      fabric: fabricResult,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------------------------------------
// DELETE DOCUMENT
// ---------------------------------------------
exports.remove = async (req, res) => {
  try {
    const doc = await PublicDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    if (fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
    await doc.deleteOne();

    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
};

// ---------------------------------------------
// DOWNLOAD
// ---------------------------------------------
exports.download = async (req, res) => {
  try {
    const doc = await PublicDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (!fs.existsSync(doc.path)) return res.status(410).json({ message: "File missing" });

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.originalName)}"`);

    fs.createReadStream(doc.path).pipe(res);
  } catch {
    res.status(500).json({ message: "Download failed" });
  }
};

// ---------------------------------------------
// INLINE PREVIEW
// ---------------------------------------------
exports.preview = async (req, res) => {
  try {
    const doc = await PublicDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    if (!fs.existsSync(doc.path)) return res.status(410).json({ message: "File missing" });

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);

    fs.createReadStream(doc.path).pipe(res);
  } catch {
    res.status(500).json({ message: "Preview failed" });
  }
};
