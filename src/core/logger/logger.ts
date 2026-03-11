/**
 * logger.ts
 *
 * Custom structured logger for the entire backend.
 *
 * PURPOSE:
 * Replaces raw console.log() across the codebase with a consistent,
 * leveled, timestamped logger that makes debugging dramatically easier.
 *
 * LOG LEVELS (in order of severity):
 *   debug  → detailed internals, only printed in development
 *   info   → normal operational messages (server started, DB connected)
 *   warn   → something unexpected but recoverable
 *   error  → something broke and needs attention
 *
 * HOW TO USE:
 *   import { logger } from '../core/logger/logger';
 *
 *   logger.info('Server started on port 4000');
 *   logger.warn('Coupon code used near expiry', { couponId: '...' });
 *   logger.error('Payment webhook failed', { orderId: '...', reason: err.message });
 *   logger.debug('Raw webhook payload', { payload });  // Only shows in development
 *
 * HOW TO DEBUG:
 * - Set LOG_LEVEL=debug in .env to see all internal logs during development.
 * - Set LOG_LEVEL=error in production to reduce noise.
 * - Every log line includes a timestamp, level, and optional context object.
 * - Error logs automatically print the stack trace if an Error object is passed.
 *
 * OUTPUT FORMAT:
 *   [2025-01-15 14:32:01] [INFO]  Server listening on port 4000
 *   [2025-01-15 14:32:05] [WARN]  Coupon near expiry { couponId: 'XYZ' }
 *   [2025-01-15 14:32:10] [ERROR] Webhook signature mismatch { orderId: 'rzp_...' }
 */

import { env } from '../config/env.js';

// ─── Level Hierarchy ─────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info:  'INFO ',
  warn:  'WARN ',
  error: 'ERROR',
};

// ANSI colour codes — only applied in development for readability
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info:  '\x1b[32m', // green
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};
const RESET = '\x1b[0m';

// ─── Timestamp ───────────────────────────────────────────────────────────────

const getTimestamp = (): string => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

// ─── Core Log Function ───────────────────────────────────────────────────────

const log = (level: LogLevel, message: string, context?: Record<string, any> | Error): void => {
  const configuredLevel = (env.LOG_LEVEL ?? 'info') as LogLevel;

  // Skip logs below the configured minimum level
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[configuredLevel]) return;

  const timestamp = getTimestamp();
  const label = LEVEL_LABELS[level];

  // Apply colors only in development (terminals support them, log files do not)
  const prefix = env.IS_DEVELOPMENT
    ? `${LEVEL_COLORS[level]}[${timestamp}] [${label}]${RESET}`
    : `[${timestamp}] [${label}]`;

  // Handle context — if it's an Error, print message + stack
  if (context instanceof Error) {
    console[level === 'debug' ? 'log' : level](
      `${prefix} ${message}\n         Message : ${context.message}\n         Stack   : ${context.stack}`
    );
    return;
  }

  // If context object provided, pretty-print it on the same line
  if (context && Object.keys(context).length > 0) {
    const contextStr = env.IS_DEVELOPMENT
      ? JSON.stringify(context, null, 2)
      : JSON.stringify(context);
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}\n`, contextStr);
    return;
  }

  console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
};

// ─── Public Logger Interface ─────────────────────────────────────────────────

export const logger = {
  /**
   * Detailed internal logs — only visible when LOG_LEVEL=debug.
   * Use for things like raw payloads, DB query details, step-by-step flow.
   */
  debug: (message: string, context?: Record<string, any>) => log('debug', message, context),

  /**
   * Normal operation logs — server started, DB connected, request received.
   */
  info: (message: string, context?: Record<string, any>) => log('info', message, context),

  /**
   * Something unexpected but the system is still running.
   * Examples: duplicate seed skip, optional config missing, near-expired coupon.
   */
  warn: (message: string, context?: Record<string, any> | Error) => log('warn', message, context),

  /**
   * Something broke and needs attention.
   * Always pass the Error object as context so the stack trace is logged.
   * Example: logger.error('Webhook failed', error)
   */
  error: (message: string, context?: Record<string, any> | Error) => log('error', message, context),

  /**
   * Logs a clear section divider — useful for startup sequence readability.
   * Example output:  ──────── DATABASE ────────
   */
  section: (label: string) => {
    const line = '─'.repeat(20);
    console.log(`\n${line} ${label.toUpperCase()} ${line}\n`);
  },
};