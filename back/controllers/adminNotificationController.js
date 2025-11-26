const AdminNotification = require('../models/adminNotification.model');
const User = require('../models/user.model');
const { emitNotificationToAdmin } = require('../config/socket');

// Get all notifications for an admin user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notifications = await AdminNotification.find({ userId })
      .populate('residentId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 notifications

    const unreadCount = await AdminNotification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await AdminNotification.countDocuments({ 
      userId, 
      isRead: false 
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await AdminNotification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await AdminNotification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await AdminNotification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete all read notifications
exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await AdminNotification.deleteMany({
      userId,
      isRead: true
    });

    res.json({ message: 'All read notifications deleted' });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to create admin notification (to be used by other controllers)
exports.createAdminNotification = async (data) => {
  try {
    // Get all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    
    if (adminUsers.length === 0) {
      console.warn('No admin users found to notify');
      return [];
    }

    // Create notification for each admin
    const notifications = [];
    for (const admin of adminUsers) {
      const notification = new AdminNotification({
        userId: admin._id,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        relatedId: data.relatedId,
        relatedModel: data.relatedModel,
        residentId: data.residentId,
        residentName: data.residentName,
        priority: data.priority || 'medium',
        metadata: data.metadata
      });
      
      await notification.save();
      notifications.push(notification);
      
      // Emit real-time notification via Socket.IO
      try {
        emitNotificationToAdmin(admin._id, notification);
      } catch (socketErr) {
        console.warn('Failed to emit socket notification to admin:', socketErr.message);
        // Non-blocking: notification is still saved in DB
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    throw error;
  }
};

// Helper function to notify admins about a new complaint
exports.notifyComplaintCreated = async (complaint, resident) => {
  try {
    const residentName = resident 
      ? `${resident.firstName} ${resident.lastName}` 
      : 'Unknown Resident';
    
    await exports.createAdminNotification({
      type: 'complaint',
      title: `New ${complaint.type === 'complaint' ? 'Complaint' : 'Report'} Submitted`,
      message: `${residentName} submitted a new ${complaint.type}: "${complaint.title}"`,
      link: `/admin/reports-complaints`,
      relatedId: complaint._id,
      relatedModel: 'Complaint',
      residentId: resident?._id,
      residentName,
      priority: complaint.priority === 'urgent' ? 'urgent' : complaint.priority === 'high' ? 'high' : 'medium',
      metadata: {
        complaintType: complaint.type,
        category: complaint.category,
        priority: complaint.priority,
        location: complaint.location
      }
    });
  } catch (error) {
    console.error('Error notifying admins about complaint:', error);
    // Don't throw - this should not block the main operation
  }
};

// Helper function to notify admins about a new document request
exports.notifyDocumentRequestCreated = async (documentRequest, resident) => {
  try {
    const residentName = resident 
      ? `${resident.firstName} ${resident.lastName}` 
      : 'Unknown Resident';
    
    await exports.createAdminNotification({
      type: 'document_request',
      title: 'New Document Request',
      message: `${residentName} requested: ${documentRequest.documentType}`,
      link: `/admin/document-requests`,
      relatedId: documentRequest._id,
      relatedModel: 'DocumentRequest',
      residentId: resident?._id,
      residentName,
      priority: 'medium',
      metadata: {
        documentType: documentRequest.documentType,
        purpose: documentRequest.purpose,
        quantity: documentRequest.quantity,
        businessName: documentRequest.businessName
      }
    });
  } catch (error) {
    console.error('Error notifying admins about document request:', error);
    // Don't throw - this should not block the main operation
  }
};
