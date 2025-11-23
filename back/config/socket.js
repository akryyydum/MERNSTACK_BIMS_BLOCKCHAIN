const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Resident = require('../models/resident.model');

let io;

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
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
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    }
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
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
    console.log(`User connected: ${socket.userId} (${socket.id})`);
    
    // Store the connection
    connectedUsers.set(socket.userId, socket.id);
    
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

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId} (${socket.id})`);
      connectedUsers.delete(socket.userId);
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
