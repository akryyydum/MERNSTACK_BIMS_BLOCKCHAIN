const { createNotification } = require('../controllers/residentNotificationController');

/**
 * Helper functions to create notifications for various events
 */

// Document request notifications
const notifyDocumentRequestStatusChange = async (residentId, documentType, status, requestId) => {
  const messages = {
    accepted: {
      title: 'Document Request Accepted',
      message: `Your ${documentType} request has been accepted and is being processed.`,
      priority: 'medium'
    },
    declined: {
      title: 'Document Request Declined',
      message: `Your ${documentType} request has been declined.`,
      priority: 'high'
    },
    completed: {
      title: 'Document Request Completed',
      message: `Your ${documentType} is ready for pickup.`,
      priority: 'high'
    },
    released: {
      title: 'Document Released',
      message: `Your ${documentType} has been released.`,
      priority: 'medium'
    }
  };

  const config = messages[status];
  if (!config) return;

  try {
    await createNotification({
      residentId,
      type: 'document_request',
      title: config.title,
      message: config.message,
      link: '/resident/requests',
      relatedId: requestId,
      priority: config.priority
    });
  } catch (error) {
    console.error('Error creating document request notification:', error);
  }
};

// Complaint/Report notifications
const notifyComplaintStatusChange = async (residentId, complaintType, status, complaintId) => {
  const messages = {
    investigating: {
      title: 'Complaint Under Investigation',
      message: `Your ${complaintType} is being investigated.`,
      priority: 'medium'
    },
    resolved: {
      title: 'Complaint Resolved',
      message: `Your ${complaintType} has been resolved.`,
      priority: 'high'
    },
    closed: {
      title: 'Complaint Closed',
      message: `Your ${complaintType} has been closed.`,
      priority: 'medium'
    }
  };

  const config = messages[status];
  if (!config) return;

  try {
    await createNotification({
      residentId,
      type: 'complaint',
      title: config.title,
      message: config.message,
      link: '/resident/reports-complaints',
      relatedId: complaintId,
      priority: config.priority
    });
  } catch (error) {
    console.error('Error creating complaint notification:', error);
  }
};

// Payment notifications
const notifyPaymentDue = async (residentId, paymentType, amount, isOverdue = false) => {
  try {
    await createNotification({
      residentId,
      type: 'payment',
      title: isOverdue ? `Overdue ${paymentType}` : `${paymentType} Due`,
      message: `Your ${paymentType.toLowerCase()} balance is ₱${amount.toFixed(2)}. ${isOverdue ? 'Payment is overdue.' : 'Please pay before the end of the month.'}`,
      link: '/resident/payments',
      priority: isOverdue ? 'high' : 'medium'
    });
  } catch (error) {
    console.error('Error creating payment notification:', error);
  }
};

const notifyPaymentReceived = async (residentId, paymentType, amount) => {
  try {
    await createNotification({
      residentId,
      type: 'payment',
      title: 'Payment Received',
      message: `Your ${paymentType.toLowerCase()} payment of ₱${amount.toFixed(2)} has been received.`,
      link: '/resident/payments',
      priority: 'medium'
    });
  } catch (error) {
    console.error('Error creating payment received notification:', error);
  }
};

// Account notifications
const notifyAccountStatusChange = async (residentId, status) => {
  const messages = {
    verified: {
      title: 'Account Verified',
      message: 'Your account has been verified. You now have full access to the system.',
      priority: 'high'
    },
    rejected: {
      title: 'Account Rejected',
      message: 'Your account verification was rejected. Please contact the administrator.',
      priority: 'high'
    },
    pending: {
      title: 'Account Pending',
      message: 'Your account is pending verification.',
      priority: 'medium'
    }
  };

  const config = messages[status];
  if (!config) return;

  try {
    await createNotification({
      residentId,
      type: 'account',
      title: config.title,
      message: config.message,
      link: '/resident/profile',
      priority: config.priority
    });
  } catch (error) {
    console.error('Error creating account notification:', error);
  }
};

const notifyAccountUpdate = async (residentId) => {
  try {
    await createNotification({
      residentId,
      type: 'account',
      title: 'Account Updated',
      message: 'Your account information has been updated by an administrator.',
      link: '/resident/profile',
      priority: 'medium'
    });
  } catch (error) {
    console.error('Error creating account update notification:', error);
  }
};

module.exports = {
  notifyDocumentRequestStatusChange,
  notifyComplaintStatusChange,
  notifyPaymentDue,
  notifyPaymentReceived,
  notifyAccountStatusChange,
  notifyAccountUpdate
};
