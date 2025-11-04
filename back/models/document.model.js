// models/DocumentRequest.js
const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  documentType: { 
    type: String, 
    enum: ['Barangay Certificate', 'Indigency', 'Barangay Clearance', 'Residency', 'Business Clearance'], 
    required: true 
  },
  // Quantity of copies requested
  quantity: { type: Number, default: 1, min: 1 },
  purpose: { type: String },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed'],
    default: 'pending'
  },
  // Optional fee amount set by admin (e.g., for Business Clearance)
  feeAmount: { type: Number },
  
  blockchain: {
    hash: String,
    lastTxId: String,
    issuedBy: String,
    issuedTo: String,
    issuedAt: Date
  },

  requestedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
