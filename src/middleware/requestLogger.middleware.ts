/**
 * Request Logging Middleware
 * 
 * Logs all incoming requests and their response times.
 * Helpful for debugging and monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Simple request logger middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip logging in test environment
  if (env.NODE_ENV === 'test') {
    return next();
  }
  
  const start = Date.now();
  
  // Log when request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 500) {
      console.error(`❌ ${message}`);
    } else if (res.statusCode >= 400) {
      console.warn(`⚠️ ${message}`);
    } else if (env.LOG_LEVEL === 'debug') {
      console.log(`✅ ${message}`);
    } else {
      // Only log successful requests if debug level
      console.log(`✅ ${req.method} ${req.originalUrl} ${res.statusCode}`);
    }
  });
  
  next();
};