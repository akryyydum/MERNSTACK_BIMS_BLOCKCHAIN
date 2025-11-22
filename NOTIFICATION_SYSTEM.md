# Notification System Documentation

## Overview
The notification system allows residents to receive **real-time** updates about their:
- Document requests (accepted, declined, completed)
- Payments (upcoming, overdue, received)
- Reports and complaints (status updates)
- Account changes (verification status, profile updates)

The system uses **Socket.IO** for real-time push notifications, eliminating the need for constant polling and ensuring instant delivery of notifications.

## Architecture

### Real-Time Communication
- **Socket.IO Server**: Runs alongside Express server on the backend
- **Socket.IO Client**: Connects from the frontend and listens for real-time events
- **Authentication**: Socket connections are authenticated using JWT tokens
- **Room-based Broadcasting**: Each resident joins a specific room for targeted notifications

## Backend Components

### Socket.IO Configuration
- **`config/socket.js`**: Socket.IO server initialization and event handlers
  - `initializeSocket(server)`: Initializes Socket.IO with CORS settings
  - `emitNotificationToResident(residentId, notification)`: Sends real-time notification
  - `emitNotificationUpdate(residentId, notificationId, updates)`: Broadcasts updates
  - `emitNotificationDelete(residentId, notificationId)`: Notifies of deletions

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

### Socket.IO Integration
- **`hooks/useSocket.js`**: Custom React hook for Socket.IO client
  - Manages socket connection lifecycle
  - Handles authentication with JWT token
  - Listens for notification events
  - Auto-reconnects on disconnection

### ResidentNavbar.jsx
- Displays notification bell icon with badge showing unread count
- Popover shows list of notifications with:
  - Priority indicators (color-coded borders)
  - Unread status highlighting
  - Mark as read button
  - Delete button
  - Clickable notifications that navigate to relevant pages

### Features
- **Real-time push notifications** via Socket.IO
- Unread count badge
- Click to navigate to related content
- Mark individual or all notifications as read
- Delete individual notifications
- Responsive design (works on mobile and desktop)
- **Auto-reconnection** on network issues
- Fallback polling every 5 minutes (in case of socket issues)

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

### Installation
First, install the required dependencies:

```bash
# Backend
cd back
npm install socket.io

# Frontend  
cd front
npm install socket.io-client
```

### Manual Testing
1. Start the backend server (Socket.IO will initialize automatically)
2. Log in as a resident
3. Open browser console to see Socket.IO connection logs
4. Look for the bell icon in the navbar
5. Trigger actions that create notifications (e.g., have admin accept a document request)
6. Notifications should appear **instantly** without page refresh
7. Check console for messages like "📨 New notification received"

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
- Push notifications for mobile apps (using FCM/APNs)
- Notification preferences/settings
- Notification categories/filters
- Sound alerts for new notifications
- Desktop notifications using Web Notifications API
- Notification history/archive
- Batch notification sending for admins

## Socket.IO Events

### Client → Server
- `connection`: Authenticate and join rooms
- `disconnect`: Clean up user connection
- `refresh:notifications`: Request notification refresh

### Server → Client
- `notification:new`: New notification created
  ```javascript
  {
    notification: { _id, type, title, message, ... },
    unreadCount: 1
  }
  ```
- `notification:update`: Notification updated
  ```javascript
  {
    notificationId: "...",
    updates: { isRead: true }
  }
  ```
- `notification:delete`: Notification deleted
  ```javascript
  {
    notificationId: "..."
  }
  ```
- `notifications:refresh`: Request full refresh

## Socket.IO Connection Flow

1. **Frontend**: User logs in and token is stored
2. **Frontend**: Socket connects with JWT token in auth
3. **Backend**: Token is verified, user ID extracted
4. **Backend**: Socket joins `user:{userId}` and `resident:{residentId}` rooms
5. **Backend**: When notification is created, it's emitted to the resident's room
6. **Frontend**: Socket receives event and updates UI instantly
7. **Frontend**: On disconnect, socket auto-reconnects with exponential backoff

## Troubleshooting

### Socket not connecting
- Check if JWT token exists in localStorage
- Verify CORS settings include your frontend URL
- Check browser console for connection errors
- Ensure backend server is running with Socket.IO initialized

### Notifications not appearing in real-time
- Check browser console for socket connection status
- Verify socket is emitting events (check backend logs)
- Ensure resident is in correct room (check `socket.residentId`)
- Check network tab for WebSocket/polling connections

### High server load
- Socket.IO uses WebSocket by default (efficient)
- Falls back to polling only if WebSocket unavailable
- Connections are kept alive with minimal overhead
- Consider horizontal scaling with Redis adapter for multiple servers

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
