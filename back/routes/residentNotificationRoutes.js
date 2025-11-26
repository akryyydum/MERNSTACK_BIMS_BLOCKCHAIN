const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/residentNotificationController');
const { auth } = require('../middleware/authMiddleware');

// Get all notifications for the authenticated resident
router.get('/', auth, notificationController.getNotifications);

// Mark a notification as read
router.patch('/:notificationId/read', auth, notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', auth, notificationController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', auth, notificationController.deleteNotification);

module.exports = router;
