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

    // Build quick lookup map for chain documents by docId
    const chainMap = new Map();
    blockchainDocs.forEach(d => {
      if (d && d.docId) chainMap.set(d.docId, d);
    });

    // Derive status for each mongo document
    const augmented = mongoDocs.map(mDoc => {
      const docObj = mDoc.toObject();
      const chainDoc = chainMap.get(mDoc._id.toString());
      let status = "verified"; // optimistic default
      try {
        // File missing counts as deleted
        if (!fs.existsSync(mDoc.path)) {
          status = "deleted";
        } else if (!chainDoc) {
          status = "not_registered"; // no blockchain record
        } else if (chainDoc.deleted === true) {
          status = "deleted"; // deleted flag on chain
        } else {
          // Compute current hash and compare
          const fileBuffer = fs.readFileSync(mDoc.path);
          const currentHash = crypto
            .createHash("sha256")
            .update(fileBuffer)
            .digest("hex");
          if (chainDoc.fileHash !== currentHash) {
            status = "edited"; // hash mismatch
          } else {
            status = "verified"; // match and not deleted
          }
        }
      } catch (e) {
        console.warn("Status evaluation error for", mDoc._id.toString(), e.message);
        status = "error";
      }
      docObj.status = status;
      return docObj;
    });

    // Aggregate counts by status for quick dashboard use (optional)
    const statusCounts = augmented.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      mongoDocs: augmented,
      blockchainDocs,
      total: mongoDocs.length,
      blockchainCount: blockchainDocs.length,
      statusCounts,
    });
  } catch (err) {
    console.error("Error listing public docs:", err);
    res.status(500).json({ message: "Failed to fetch public documents" });
  }
};

// ---------------------------------------------
// VERIFY DOCUMENT INTEGRITY
// ---------------------------------------------
exports.verifyStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. MongoDB document
    const doc = await PublicDocument.findById(id);
    if (!doc) return res.status(404).json({ status: "not_found" });

    // 2. File exists?
    if (!fs.existsSync(doc.path)) {
      return res.json({ status: "deleted" });
    }

    // 3. Compute current hash
    const fileBuffer = fs.readFileSync(doc.path);
    const currentHash = crypto.createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    // 4. Retrieve blockchain record (same ID as Mongo)
    const { contract } = await getContract();
    let chainDoc;

    try {
      const result = await contract.evaluateTransaction(
        "getDocument",
        doc._id.toString()
      );
      chainDoc = JSON.parse(result.toString());
    } catch (err) {
      return res.json({ status: "not_registered" });
    }

    // 5. Check for deleted flag on chain
    if (chainDoc.deleted === true) {
      return res.json({ status: "deleted" });
    }

    // 6. Compare hash
    if (chainDoc.fileHash !== currentHash) {
      return res.json({ status: "edited" });
    }

    // 7. OK
    return res.json({ status: "verified" });

  } catch (err) {
    console.error("verifyStatus error:", err);
    res.status(500).json({ status: "error", message: err.message });
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
