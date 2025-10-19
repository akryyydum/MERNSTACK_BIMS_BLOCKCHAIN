const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true },
  type: {
    type: String,
    enum: ['document_fee', 'garbage_fee', 'electric_fee', 'streetlight_fee', 'permit_fee', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['revenue', 'expense', 'allocation'],
    required: true
  },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  
  // Related entities
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident' },
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household' },
  documentRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRequest' },
  
  // NEW: Add official reference
  officialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Official' },
  
  // NEW: Store names directly for faster access and historical records
  residentName: { type: String },
  officialName: { type: String },
  
  // Payment details
  paymentMethod: {
    type: String,
    enum: ['cash', 'gcash', 'bank_transfer', 'other'],
    default: 'cash'
  },
  referenceNumber: { type: String },
  
  // Status and dates
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  transactionDate: { type: Date, default: Date.now },
  completedDate: { type: Date },
  
  // Blockchain integration
  blockchain: {
    hash: String,
    txId: String,
    blockNumber: Number,
    issuedBy: String,
    issuedAt: Date,
    verified: { type: Boolean, default: false }
  },
  
  // Allocation details (for resource allocation)
  allocation: {
    department: String,
    project: String,
    purpose: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate transaction ID
financialTransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    try {
      const count = await this.constructor.countDocuments({});
      const prefix = this.type === 'document_fee' ? 'DOC' : 
                     this.type === 'garbage_fee' ? 'GRB' : 
                     this.type === 'electric_fee' ? 'ELC' : 
                     this.type === 'streetlight_fee' ? 'STL' :
                     this.type === 'permit_fee' ? 'PRM' : 'TXN';
      this.transactionId = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // Fallback ID generation if count fails
      this.transactionId = `TXN-${new Date().getFullYear()}-${Date.now()}`;
    }
  }
  
  // NEW: Auto-populate resident/official names if IDs are provided
  if (this.isModified('residentId') && this.residentId && !this.residentName) {
    try {
      const Resident = mongoose.model('Resident');
      const resident = await Resident.findById(this.residentId).select('firstName lastName');
      if (resident) {
        this.residentName = `${resident.firstName} ${resident.lastName}`;
      }
    } catch (error) {
      console.error('Error fetching resident name:', error);
    }
  }
  
  if (this.isModified('officialId') && this.officialId && !this.officialName) {
    try {
      const Official = mongoose.model('Official');
      const official = await Official.findById(this.officialId).select('firstName lastName');
      if (official) {
        this.officialName = `${official.firstName} ${official.lastName}`;
      }
    } catch (error) {
      console.error('Error fetching official name:', error);
    }
  }
  
  this.updatedAt = new Date();
  if (this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  
  next();
});

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);