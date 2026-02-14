/**
 * Database Connection Configuration
 * 
 * This file handles MongoDB connection setup and lifecycle events.
 * It exports a function to connect to the database.
 */

import mongoose from 'mongoose';
import { env } from './env';

/**
 * MongoDB connection options
 */
const mongooseOptions: mongoose.ConnectOptions = {
  // Add any MongoDB specific options here
  autoIndex: env.NODE_ENV === 'development', // Auto-create indexes in development
  maxPoolSize: 10, // Maximum number of connections in the pool
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if can't connect
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

/**
 * Connect to MongoDB database
 */
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, mongooseOptions);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};