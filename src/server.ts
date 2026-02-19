/**
 * Server Entry Point
 * 
 * This file starts the HTTP server and handles graceful shutdown.
 * It imports the configured app from app.ts and starts listening.
 */

import app, { startApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const PORT = env.PORT;

// Declare server in outer scope so shutdown can access it
let server: ReturnType<typeof app.listen>;

/**
 * Start the server
 */
const startServer = async () => {
  // Wait for app initialization
  await startApp();

  server = app.listen(PORT, () => {
    logger.info(`🚀 Server is running on port ${PORT}`);
    logger.info(`📝 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  });
};

// Start server
startServer().catch((error) => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
});

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`⚠️ Received ${signal}, shutting down gracefully...`);
  
  if (!server) {
    logger.warn('Server not started yet. Exiting.');
    process.exit(0);
  }

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds if graceful fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  // FIXED: Combined multiple arguments into a single meta object
  logger.error('Unhandled Rejection at:', { promise, reason });
});
