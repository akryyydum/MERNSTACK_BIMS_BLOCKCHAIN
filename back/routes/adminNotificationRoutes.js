const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/authMiddleware');
const adminNotificationController = require('../controllers/adminNotificationController');

// All routes require admin authentication
router.use(auth);
router.use(authorize('admin'));

// Get all notifications for the authenticated admin
router.get('/', adminNotificationController.getNotifications);

// Get unread notification count
router.get('/unread-count', adminNotificationController.getUnreadCount);

// Mark a specific notification as read
router.patch('/:notificationId/read', adminNotificationController.markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', adminNotificationController.markAllAsRead);

// Delete a specific notification
router.delete('/:notificationId', adminNotificationController.deleteNotification);

// Delete all read notifications
router.delete('/read/all', adminNotificationController.deleteAllRead);

module.exports = router;
