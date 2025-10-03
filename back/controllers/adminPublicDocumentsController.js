const fs = require("fs");
const path = require("path");
const PublicDocument = require("../models/publicdocs.model");

exports.listAdmin = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const filter = q
      ? {
          $or: [
            { title: new RegExp(q, "i") },
            { description: new RegExp(q, "i") },
            { category: new RegExp(q, "i") },
          ],
        }
      : {};
    const docs = await PublicDocument.find(filter)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "username role");
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch documents" });
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
    if (!req.file) return res.status(400).json({ message: "File required" });
    const { title, description, category } = req.body;

    const doc = await PublicDocument.create({
      title,
      description: description || "",
      category: category || "General",
      originalName: req.file.originalname,
      storedFilename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: req.user.id || req.user._id,
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: "Failed to upload", error: e.message });
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