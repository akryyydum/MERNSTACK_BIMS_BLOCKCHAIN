const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  residentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Resident', 
    required: true 
  },
  type: {
    type: String,
    enum: ['document_request', 'payment', 'complaint', 'account'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // Optional link to related resource
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of related document/complaint/payment
  isRead: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
notificationSchema.index({ residentId: 1, createdAt: -1 });
notificationSchema.index({ residentId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
