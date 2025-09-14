const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' }, // NEW
  documentType: { 
    type: String, 
    enum: ['Barangay Certificate', 'Indigency', 'Barangay Clearance', 'Residency', 'Business Clearance'], 
    required: true 
  },
  businessName: { type: String, trim: true }, // NEW
  purpose: { type: String },
  // align with frontend statuses
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'completed'], default: 'pending' }, // UPDATED
  
  blockchain: {
    hash: String,
    lastTxId: String,
    issuedBy: String,
    issuedAt: Date
  },

  requestedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// require businessName when Business Clearance
documentRequestSchema.pre('validate', function(next) {
  if (this.documentType === 'Business Clearance' && !this.businessName) {
    this.invalidate('businessName', 'Business name is required for Business Clearance');
  }
  next();
});

// keep updatedAt fresh
documentRequestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);
