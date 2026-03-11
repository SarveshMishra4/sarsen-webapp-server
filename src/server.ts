/**
 * server.ts
 *
 * Server entry point. Connects to the database and starts Express.
 *
 * PURPOSE:
 * Separated from app.ts so the Express app can be imported and tested
 * without actually binding to a port. This file is what you run in production.
 *
 * RUN:
 *   Development:  npx ts-node src/server.ts
 *   Production:   node dist/server.js
 *   With nodemon: nodemon src/server.ts
 *
 * STARTUP SEQUENCE:
 * 1. env.ts validates environment (imported via app.ts)
 * 2. MongoDB connection established
 * 3. Express server starts listening
 * 4. Graceful shutdown handlers registered
 *
 * HOW TO DEBUG:
 * - If server crashes immediately, read the error from env.ts (printed before crash).
 * - If server starts but DB queries fail, check the MongoDB connection log lines.
 * - "EADDRINUSE" means another process is already using your PORT.
 *   Kill it with: lsof -ti:4000 | xargs kill
 * - Graceful shutdown ensures in-flight requests complete before the process exits.
 *   You will see "[Server] Graceful shutdown complete" when this works correctly.
 */

import app from './app.js';
import { connectDatabase, disconnectDatabase } from './core/database/database.js';
import { logger } from './core/logger/logger.js';
import { env } from './core/config/env.js';

// ─── Start Server ─────────────────────────────────────────────────────────────

const startServer = async (): Promise<void> => {
  logger.section('startup');

  // Step 1: Connect to MongoDB
  await connectDatabase();

  // Step 2: Start Express
  const server = app.listen(env.PORT, () => {
    logger.info(`[Server] ✅ Listening on port ${env.PORT}`);
    logger.info(`[Server]    Environment : ${env.NODE_ENV}`);
    logger.info(`[Server]    Health check: http://localhost:${env.PORT}/health`);
    logger.section('ready');
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  // On SIGTERM or SIGINT: stop accepting new requests, wait for in-flight
  // requests to finish, close DB connection, then exit cleanly.

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`[Server] ${signal} received — starting graceful shutdown...`);

    server.close(async () => {
      logger.info('[Server] HTTP server closed (no new connections accepted).');

      try {
        await disconnectDatabase();
        logger.info('[Server] ✅ Graceful shutdown complete.');
        process.exit(0);
      } catch (err) {
        logger.error('[Server] Error during shutdown', err as Error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if graceful close hangs
    setTimeout(() => {
      logger.error('[Server] Forced shutdown after timeout (10s).');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM')); // Docker / cloud stop signal
  process.on('SIGINT',  () => shutdown('SIGINT'));  // Ctrl+C in terminal

  // ─── Unhandled Promise Rejections ───────────────────────────────────────────
  // Catches any async error that wasn't caught in a try/catch.
  // This should not happen if all async routes use next(err).
  process.on('unhandledRejection', (reason: any) => {
    logger.error('[Server] Unhandled Promise Rejection — this indicates a missing try/catch', {
      reason: reason?.message ?? String(reason),
      stack: reason?.stack,
    });
    // Do not exit in production for a single unhandled rejection
    // but log it loudly so it gets fixed
  });

  // ─── Uncaught Exceptions ────────────────────────────────────────────────────
  // Catches synchronous errors that escaped all handlers.
  // These are fatal — the process state is unknown so we shut down.
  process.on('uncaughtException', (err: Error) => {
    logger.error('[Server] Uncaught Exception — shutting down immediately', err);
    process.exit(1);
  });
};

// ─── Run ──────────────────────────────────────────────────────────────────────

startServer().catch((err) => {
  logger.error('[Server] Fatal error during startup', err);
  process.exit(1);
});