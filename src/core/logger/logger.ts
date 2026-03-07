/**
 * FILE: core/logger/logger.ts
 *
 * PURPOSE
 * Central logging utility used throughout the backend.
 *
 * IMPORTED IN
 * - Controllers
 * - Services
 * - Middleware
 *
 * DEPENDENCIES
 * None
 */

export const logger = {
  info: (message: string) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  },

  warn: (message: string) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  },

  error: (message: string) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  },

  debug: (message: string) => {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
  }
};