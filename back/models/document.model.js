// models/DocumentRequest.js
const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true }, // Who made the request
  requestFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' }, // Who the document is for (temporarily not required)
  documentType: { 
    type: String, 
    enum: ['Certificate of Indigency', 'Barangay Clearance', 'Business Clearance'], 
    required: true 
  },
  // Quantity of copies requested
  quantity: { type: Number, default: 1, min: 1 },
  purpose: { type: String },
  amount: { type: Number, default: 0 }, // Document fee amount
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed'],
    default: 'pending'
  },
  // Optional business name for Business Clearance
  businessName: { type: String },
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
  completedAt: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
documentRequestSchema.index({ residentId: 1, requestedAt: -1 });
documentRequestSchema.index({ requestedBy: 1, requestedAt: -1 });
documentRequestSchema.index({ status: 1, requestedAt: -1 });
documentRequestSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
