const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Resident = require('../models/resident.model');
const { SocketRateLimiter, createSocketRateLimitMiddleware } = require('../middleware/socketRateLimit');
const { updateSocketConnections, recordSocketEvent } = require('../utils/metrics');

let io;

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

// Initialize rate limiter for sockets
const socketRateLimiter = new SocketRateLimiter({
  capacity: 60, // 60 events
  refillRate: 1, // per second (60/minute)
});

const initializeSocket = (server) => {
  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: [
        "https://mernstack-bims-blockchain-3.vercel.app",
        "https://www.latorrenorth.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4000",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    allowUpgrades: true,
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      // Try to get token from cookies first, then fallback to auth.token
      let token = null;
      
      // Parse cookies from handshake headers
      const cookies = socket.handshake.headers.cookie;
      if (cookies) {
        const cookieArray = cookies.split(';');
        for (const cookie of cookieArray) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'accessToken') {
            token = value;
            break;
          }
        }
      }
      
      // Fallback to auth.token for backward compatibility
      if (!token) {
        token = socket.handshake.auth.token;
      }
      
      if (!token) {
        console.warn('[Socket Auth] Missing token in cookies/auth for', socket.handshake.headers.origin);
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId} (${socket.id}) role=${socket.userRole}`);
    
    // Store the connection
    connectedUsers.set(socket.userId, socket.id);
    
    // Update metrics
    updateSocketConnections(connectedUsers.size);
    
    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // If it's a resident, also join resident-specific room
    if (socket.userRole === 'resident') {
      try {
        const resident = await Resident.findOne({ user: socket.userId });
        if (resident) {
          socket.residentId = resident._id.toString();
          socket.join(`resident:${resident._id}`);
        }
      } catch (error) {
        console.error('Error finding resident:', error);
      }
    }

    // Apply rate limiting to socket events
    socket.use((packet, next) => {
      const [event] = packet;
      
      // Skip internal events
      if (event.startsWith('internal:') || event === 'disconnect' || event === 'error') {
        return next();
      }

      const allowed = socketRateLimiter.allowEvent(socket.id);
      
      if (!allowed) {
        const remaining = socketRateLimiter.getRemainingTokens(socket.id);
        console.warn(`[Socket Rate Limit] Blocked event "${event}" from ${socket.id} (${socket.userId})`);
        
        socket.emit('rate_limit_exceeded', {
          message: 'Too many events. Please slow down.',
          remaining,
          retryAfter: Math.ceil(1 / socketRateLimiter.config.refillRate),
        });
        
        recordSocketEvent(event, 'rate_limited');
        return; // Block the event
      }

      recordSocketEvent(event, 'success');
      next();
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.userId} (${socket.id}) reason=${reason}`);
      connectedUsers.delete(socket.userId);
      socketRateLimiter.removeBucket(socket.id);
      updateSocketConnections(connectedUsers.size);
    });

    // Optional: Handle manual notification refresh request
    socket.on('refresh:notifications', () => {
      socket.emit('notifications:refresh');
    });
  });

  console.log('Socket.IO initialized');
  return io;
};

// Emit notification to a specific resident
const emitNotificationToResident = (residentId, notification) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  try {
    // Emit to the resident's room
    io.to(`resident:${residentId}`).emit('notification:new', {
      notification,
      unreadCount: 1 // This will be updated by the client
    });
    
    console.log(`Notification sent to resident ${residentId}`);
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

// Emit notification update (e.g., marked as read)
const emitNotificationUpdate = (residentId, notificationId, updates) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  try {
    io.to(`resident:${residentId}`).emit('notification:update', {
      notificationId,
      updates
    });
  } catch (error) {
    console.error('Error emitting notification update:', error);
  }
};

// Emit notification deletion
const emitNotificationDelete = (residentId, notificationId) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  try {
    io.to(`resident:${residentId}`).emit('notification:delete', {
      notificationId
    });
  } catch (error) {
    console.error('Error emitting notification delete:', error);
  }
};

// Get Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  emitNotificationToResident,
  emitNotificationUpdate,
  emitNotificationDelete,
  getIO
};
