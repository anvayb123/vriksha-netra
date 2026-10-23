const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.warn('⚠️  MONGO_URI not set. Running in offline mode with local data only.');
      return false;
    }

    const conn = await mongoose.connect(mongoUri, {
      // Connection pool settings for production readiness
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);

    // Connection event handlers for monitoring
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.warn('⚠️  Falling back to offline mode.');
    return false;
  }
};

// Graceful shutdown — close MongoDB connection on app termination
const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed gracefully');
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = connectDB;
