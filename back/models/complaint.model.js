const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  residentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Resident', 
    required: true 
  },
  type: {
    type: String,
    enum: ['complaint', 'report'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'Noise Complaint', 
      'Property Dispute', 
      'Public Safety', 
      'Infrastructure', 
      'Environmental', 
      'Animal Control',
      'Traffic/Parking',
      'Other'
    ],
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true }, // This can be purok or any location
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'closed'],
    default: 'pending'
  },
  response: { type: String, trim: true }, // Admin response
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  attachments: [{ type: String }], // File paths/URLs
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

complaintSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);