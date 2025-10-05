const mongoose = require('mongoose');

// Enhanced connection helper for Mongoose >= 7
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[DB] MONGO_URI is not defined in environment variables');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri); // Deprecated options removed
    console.log('[DB] MongoDB connected');

    // Connection event listeners (useful for debugging / resilience)
    mongoose.connection.on('error', (err) => {
      console.error('[DB] Connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] Connection lost. Awaiting reconnection...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[DB] Reconnected to MongoDB');
    });
  } catch (err) {
    console.error('[DB] Initial connection failure:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
