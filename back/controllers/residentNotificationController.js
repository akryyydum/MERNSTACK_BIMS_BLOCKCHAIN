const Notification = require('../models/notification.model');
const Resident = require('../models/resident.model');
const DocumentRequest = require('../models/document.model');
const Complaint = require('../models/complaint.model');
const Household = require('../models/household.model');

// Get all notifications for a resident
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find the resident associated with this user
    const resident = await Resident.findOne({ user: userId });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    const notifications = await Notification.find({ residentId: resident._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ 
      residentId: resident._id, 
      isRead: false 
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const resident = await Resident.findOne({ user: userId });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, residentId: resident._id },
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
    
    const resident = await Resident.findOne({ user: userId });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    await Notification.updateMany(
      { residentId: resident._id, isRead: false },
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
    
    const resident = await Resident.findOne({ user: userId });
    if (!resident) {
      return res.status(404).json({ message: 'Resident not found' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      residentId: resident._id
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

// Generate notifications for upcoming/overdue payments
exports.generatePaymentNotifications = async (residentId) => {
  try {
    const resident = await Resident.findById(residentId);
    if (!resident) return;

    const household = await Household.findOne({
      $or: [
        { headOfHousehold: residentId },
        { members: residentId }
      ]
    });

    if (!household) return;

    const notifications = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Check garbage fee
    if (household.garbageFee && household.garbageFee.balance > 0) {
      const lastPayment = household.garbageFee.lastPaymentDate;
      const isOverdue = !lastPayment || new Date(lastPayment).getMonth() < currentMonth - 1;
      
      notifications.push({
        residentId: residentId,
        type: 'payment',
        title: isOverdue ? 'Overdue Garbage Fee' : 'Garbage Fee Due',
        message: `Your garbage fee balance is ₱${household.garbageFee.balance.toFixed(2)}. ${isOverdue ? 'Payment is overdue.' : 'Please pay before the end of the month.'}`,
        link: '/resident/payments',
        priority: isOverdue ? 'high' : 'medium'
      });
    }

    // Check streetlight fee
    if (household.streetlightFee && household.streetlightFee.balance > 0) {
      const lastPayment = household.streetlightFee.lastPaymentDate;
      const isOverdue = !lastPayment || new Date(lastPayment).getMonth() < currentMonth - 1;
      
      notifications.push({
        residentId: residentId,
        type: 'payment',
        title: isOverdue ? 'Overdue Streetlight Fee' : 'Streetlight Fee Due',
        message: `Your streetlight fee balance is ₱${household.streetlightFee.balance.toFixed(2)}. ${isOverdue ? 'Payment is overdue.' : 'Please pay before the end of the month.'}`,
        link: '/resident/payments',
        priority: isOverdue ? 'high' : 'medium'
      });
    }

    // Insert notifications if any
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error('Error generating payment notifications:', error);
  }
};

// Create notification helper function (to be used by other controllers)
exports.createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};
