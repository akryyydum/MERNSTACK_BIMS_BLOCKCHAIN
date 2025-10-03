const mongoose = require("mongoose");

const PublicDocSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    visibility: { type: String, enum: ["public"], default: "public" },
    originalName: { type: String, required: true },
    storedFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Keep only text index on title + description
PublicDocSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("PublicDocument", PublicDocSchema);