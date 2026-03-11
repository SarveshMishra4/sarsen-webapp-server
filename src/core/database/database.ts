/**
 * database.ts
 *
 * Manages the MongoDB connection using Mongoose.
 *
 * PURPOSE:
 * Centralizes all database connection logic in one place.
 * Handles connection, disconnection, and reconnection automatically.
 * Logs every connection event so you can always tell whether the DB
 * is connected, retrying, or has failed.
 *
 * USAGE:
 *   import { connectDatabase } from '../core/database/database';
 *   await connectDatabase();  // Call once in app.ts before starting the server
 *
 * HOW TO DEBUG:
 * - If you see "[DB] Connection error", check your MONGODB_URI in .env.
 * - If you see "[DB] Disconnected — attempting reconnect", Mongoose will
 *   retry automatically. No action needed unless it keeps failing.
 * - If the server starts but DB queries hang, run connectDatabase() before
 *   registering routes in app.ts.
 * - To check connection state anywhere in code:
 *     import mongoose from 'mongoose';
 *     console.log(mongoose.connection.readyState);
 *     // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
 *
 * MONGOOSE OPTIONS EXPLAINED:
 * - serverSelectionTimeoutMS: how long to wait before failing if MongoDB
 *   is unreachable (default would be 30s, we set 10s for faster feedback)
 * - socketTimeoutMS: how long a query can run before timing out
 * - maxPoolSize: max number of simultaneous DB connections in the pool
 */

import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

// ─── Connection Options ──────────────────────────────────────────────────────

const MONGOOSE_OPTIONS: mongoose.ConnectOptions = {
  serverSelectionTimeoutMS: 10000, // Fail fast if MongoDB unreachable (10s)
  socketTimeoutMS: 45000,          // Kill idle sockets after 45s
  maxPoolSize: 10,                  // Max 10 concurrent DB connections
};

// ─── Event Listeners ─────────────────────────────────────────────────────────
// These are registered once and fire automatically throughout the app lifecycle.

const registerConnectionEvents = (): void => {
  const conn = mongoose.connection;

  conn.on('connected', () => {
    logger.info('[DB] ✅ MongoDB connected', {
      host: conn.host,
      port: conn.port,
      name: conn.name,
    });
  });

  conn.on('disconnected', () => {
    logger.warn('[DB] ⚠️  MongoDB disconnected — Mongoose will attempt reconnect automatically.');
  });

  conn.on('reconnected', () => {
    logger.info('[DB] ✅ MongoDB reconnected successfully.');
  });

  conn.on('error', (err: Error) => {
    logger.error('[DB] ❌ MongoDB connection error', err);
  });

  // Fires when the connection pool is saturated (too many concurrent queries)
  conn.on('fullsetup', () => {
    logger.debug('[DB] Connection pool fully initialized.');
  });
};

// ─── Connect ─────────────────────────────────────────────────────────────────

let eventsRegistered = false;

export const connectDatabase = async (): Promise<void> => {
  // Register events only once — prevents duplicate listeners on reconnect
  if (!eventsRegistered) {
    registerConnectionEvents();
    eventsRegistered = true;
  }

  logger.info('[DB] Connecting to MongoDB...');

  try {
    await mongoose.connect(env.MONGODB_URI, MONGOOSE_OPTIONS);
    // 'connected' event above will log success
  } catch (err) {
    logger.error('[DB] ❌ Failed to connect to MongoDB on startup', err as Error);
    logger.error('[DB] Check that MONGODB_URI in .env is correct and MongoDB is running.');
    process.exit(1); // Fatal — cannot run without DB
  }
};

// ─── Disconnect ──────────────────────────────────────────────────────────────
// Call this in graceful shutdown handlers.

export const disconnectDatabase = async (): Promise<void> => {
  logger.info('[DB] Closing MongoDB connection...');
  await mongoose.disconnect();
  logger.info('[DB] MongoDB connection closed.');
};