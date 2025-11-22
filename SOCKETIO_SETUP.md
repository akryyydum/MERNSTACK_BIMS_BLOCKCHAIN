# Socket.IO Real-Time Notifications - Quick Setup Guide

## Installation

```bash
# Backend
cd back
npm install socket.io

# Frontend
cd front
npm install socket.io-client
```

## Backend Setup (Already Configured)

### 1. Server Initialization (`server.js`)
```javascript
const http = require('http');
const server = http.createServer(app);

// After DB connection
const { initializeSocket } = require('./config/socket');
initializeSocket(server);

server.listen(PORT, ...);
```

### 2. Socket Configuration (`config/socket.js`)
- JWT authentication middleware
- User-specific room joining
- Event emitters for notifications

### 3. Controller Integration
All notification-creating controllers automatically emit Socket.IO events:
- `adminDocumentRequestController.js`
- `adminComplaintController.js`
- `adminResidentController.js`

## Frontend Setup (Already Configured)

### 1. Custom Hook (`hooks/useSocket.js`)
Handles:
- Connection with JWT authentication
- Auto-reconnection
- Event listeners
- Cleanup on unmount

### 2. Component Integration (`ResidentNavbar.jsx`)
```javascript
useSocket(
  (notification) => {
    // Handle new notification
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  },
  (notificationId, updates) => {
    // Handle notification update
  },
  (notificationId) => {
    // Handle notification deletion
  }
);
```

## How It Works

1. **Connection**
   - Frontend connects with JWT token on mount
   - Backend validates token and creates socket session
   - User joins personalized rooms

2. **Notification Creation**
   - Admin performs action (e.g., approves document)
   - Controller creates notification in database
   - Socket.IO emits event to resident's room
   - Frontend receives event and updates UI instantly

3. **Reconnection**
   - If connection drops, auto-reconnects
   - Fetches missed notifications on reconnect
   - Exponential backoff prevents server overload

## Environment Variables

No additional environment variables needed! Socket.IO uses the same:
- `JWT_SECRET` - for authentication
- CORS settings - already configured in `server.js`

## Testing

1. **Start Backend**
   ```bash
   cd back
   npm start
   # Look for: "✅ Socket.IO initialized"
   ```

2. **Start Frontend**
   ```bash
   cd front
   npm start
   # Check console for: "✅ Socket connected: <socket-id>"
   ```

3. **Test Real-Time**
   - Login as a resident
   - Have admin approve a document request
   - Notification appears instantly (no page refresh!)

## Console Messages

### Successful Connection
```
✅ Socket connected: abc123def456
```

### New Notification
```
📨 New notification received: { notification: {...} }
```

### Disconnection
```
❌ Socket disconnected: transport close
🔄 Attempting reconnection...
```

## Common Issues

### "Socket not connecting"
- **Check**: Token exists in localStorage
- **Fix**: Ensure user is logged in

### "CORS error"
- **Check**: Frontend URL in `allowedOrigins` array
- **Fix**: Add your URL to `config/socket.js` CORS settings

### "Authentication error"
- **Check**: JWT_SECRET matches on client/server
- **Fix**: Verify token is valid and not expired

### "Notifications delayed"
- **Check**: Socket connection status in console
- **Fix**: May be using polling fallback (slower but functional)

## Performance Notes

- **WebSocket**: Preferred, lowest latency (~10-50ms)
- **Polling**: Fallback if WebSocket blocked (~500-1000ms)
- **Memory**: ~1MB per 1000 active connections
- **CPU**: Minimal overhead (<1% for typical usage)

## Scaling (Future)

For multiple backend servers, use Redis adapter:
```bash
npm install @socket.io/redis-adapter redis
```

This allows Socket.IO to work across multiple server instances.

---

✅ **Status**: Fully configured and ready to use!
🔔 **Real-time notifications are now active!**
