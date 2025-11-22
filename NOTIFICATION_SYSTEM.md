# Notification System Documentation

## Overview
The notification system allows residents to receive real-time updates about their:
- Document requests (accepted, declined, completed)
- Payments (upcoming, overdue, received)
- Reports and complaints (status updates)
- Account changes (verification status, profile updates)

## Backend Components

### Models
- **`notification.model.js`**: Defines the notification schema with fields for type, title, message, priority, read status, etc.

### Controllers
- **`residentNotificationController.js`**: Handles notification CRUD operations
  - `getNotifications`: Fetch all notifications for a resident
  - `markAsRead`: Mark a notification as read
  - `markAllAsRead`: Mark all notifications as read
  - `deleteNotification`: Delete a notification
  - `createNotification`: Helper to create new notifications
  - `generatePaymentNotifications`: Auto-generate payment reminders

### Routes
- **`residentNotificationRoutes.js`**: API endpoints for notifications
  - `GET /api/resident/notifications` - Get all notifications
  - `PATCH /api/resident/notifications/:id/read` - Mark as read
  - `PATCH /api/resident/notifications/read-all` - Mark all as read
  - `DELETE /api/resident/notifications/:id` - Delete notification

### Utilities
- **`notificationHelper.js`**: Helper functions for creating notifications
  - `notifyDocumentRequestStatusChange()`
  - `notifyComplaintStatusChange()`
  - `notifyPaymentDue()`
  - `notifyPaymentReceived()`
  - `notifyAccountStatusChange()`
  - `notifyAccountUpdate()`

## Frontend Components

### ResidentNavbar.jsx
- Displays notification bell icon with badge showing unread count
- Popover shows list of notifications with:
  - Priority indicators (color-coded borders)
  - Unread status highlighting
  - Mark as read button
  - Delete button
  - Clickable notifications that navigate to relevant pages

### Features
- Real-time notification fetching (every 60 seconds)
- Unread count badge
- Click to navigate to related content
- Mark individual or all notifications as read
- Delete individual notifications
- Responsive design (works on mobile and desktop)

## Notification Types

### 1. Document Requests (`document_request`)
**Triggers:**
- When admin accepts a document request
- When admin declines a document request
- When document is completed and ready for pickup

**Example:**
```javascript
await createNotification({
  residentId: resident._id,
  type: 'document_request',
  title: 'Document Request Accepted',
  message: 'Your Barangay Clearance request has been accepted.',
  link: '/resident/requests',
  relatedId: requestId,
  priority: 'medium'
});
```

### 2. Payments (`payment`)
**Triggers:**
- When payment is due
- When payment is overdue
- When payment is received

**Example:**
```javascript
await createNotification({
  residentId: resident._id,
  type: 'payment',
  title: 'Overdue Garbage Fee',
  message: 'Your garbage fee balance is ₱150.00. Payment is overdue.',
  link: '/resident/payments',
  priority: 'high'
});
```

### 3. Complaints (`complaint`)
**Triggers:**
- When complaint status changes (investigating, resolved, closed)
- When admin responds to complaint

**Example:**
```javascript
await createNotification({
  residentId: resident._id,
  type: 'complaint',
  title: 'Complaint Resolved',
  message: 'Your complaint has been resolved.',
  link: '/resident/reports-complaints',
  relatedId: complaintId,
  priority: 'high'
});
```

### 4. Account Updates (`account`)
**Triggers:**
- When account is verified/rejected
- When admin updates resident information

**Example:**
```javascript
await createNotification({
  residentId: resident._id,
  type: 'account',
  title: 'Account Verified',
  message: 'Your account has been verified.',
  link: '/resident/profile',
  priority: 'high'
});
```

## Priority Levels
- **`high`**: Red border - urgent matters (overdue payments, account verification)
- **`medium`**: Orange border - normal updates (accepted requests, status changes)
- **`low`**: Green border - informational (general updates)

## Testing

### Manual Testing
1. Start the backend server
2. Log in as a resident
3. Look for the bell icon in the navbar
4. Trigger actions that create notifications (e.g., have admin accept a document request)
5. Check if notifications appear

### Automated Testing
Run the test script:
```bash
cd back
node scripts/test-notifications.js
```

This will:
- Create sample notifications
- Test fetching notifications
- Test marking as read
- Test deleting notifications

## Integration with Existing Controllers

Notifications are automatically created when:
1. **Document requests** change status (in `adminDocumentRequestController.js`)
2. **Complaints** are updated (in `adminComplaintController.js`)
3. **Resident accounts** are modified (in `adminResidentController.js`)

## Future Enhancements
- Email notifications
- SMS notifications (via Twilio/similar)
- Push notifications for mobile apps
- Notification preferences/settings
- Notification categories/filters
- Sound alerts for new notifications
- Desktop notifications using Web Notifications API

## API Usage Examples

### Get Notifications
```javascript
const response = await axios.get('/api/resident/notifications', {
  headers: { Authorization: `Bearer ${token}` }
});
// Returns: { notifications: [...], unreadCount: 5 }
```

### Mark as Read
```javascript
await axios.patch(`/api/resident/notifications/${notificationId}/read`, {}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Mark All as Read
```javascript
await axios.patch('/api/resident/notifications/read-all', {}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Delete Notification
```javascript
await axios.delete(`/api/resident/notifications/${notificationId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Database Schema

```javascript
{
  residentId: ObjectId,           // Reference to Resident
  type: String,                   // 'document_request', 'payment', 'complaint', 'account'
  title: String,                  // Notification title
  message: String,                // Notification message
  link: String,                   // Optional link to navigate to
  relatedId: ObjectId,            // Optional reference to related entity
  isRead: Boolean,                // Read status
  priority: String,               // 'low', 'medium', 'high'
  createdAt: Date                 // Timestamp
}
```

## Notes
- Notifications are fetched every 60 seconds while the resident is logged in
- Unread notifications are highlighted with a blue background
- The notification bell shows a badge with the unread count
- Clicking a notification navigates to the relevant page
- Notifications are automatically created by the system when relevant events occur
