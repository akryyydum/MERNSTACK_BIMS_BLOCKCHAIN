// models/DocumentRequest.js
const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  documentType: { 
    type: String, 
    enum: ['BarangayCertificate', 'Indigency', 'Clearance', 'Residency'], 
    required: true 
  },
  purpose: { type: String },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'PRINTED', 'RELEASED'], default: 'PENDING' },
  
  // Blockchain metadata
  blockchain: {
    hash: String, // SHA-256 hash of document metadata
    lastTxId: String,
    issuedBy: String,
    issuedAt: Date
  },

  requestedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
