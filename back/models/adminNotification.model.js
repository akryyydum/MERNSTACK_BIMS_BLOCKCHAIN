const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: {
    type: String,
    enum: ['complaint', 'document_request', 'payment', 'resident_registration', 'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // Link to related resource in admin panel
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // ID of related complaint/document/resident
  relatedModel: { 
    type: String,
    enum: ['Complaint', 'DocumentRequest', 'Resident', 'UnverifiedResident', 'FinancialTransaction']
  },
  residentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Resident'
  }, // The resident who triggered the notification
  residentName: { type: String }, // Cached resident name for quick display
  isRead: { type: Boolean, default: false },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Additional data (e.g., complaint type, document type)
  createdAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
adminNotificationSchema.index({ userId: 1, createdAt: -1 });
adminNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
adminNotificationSchema.index({ type: 1, createdAt: -1 });
adminNotificationSchema.index({ relatedId: 1 });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
