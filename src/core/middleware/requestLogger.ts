/**
 * requestLogger.ts
 *
 * Express middleware that logs every incoming HTTP request.
 *
 * PURPOSE:
 * Gives you a full trace of every request the server receives —
 * method, URL, status code, and how long it took to respond.
 * This is your first tool when debugging "why did this request fail".
 *
 * USAGE:
 * Register this BEFORE your routes in app.ts so every request is logged:
 *   import { requestLogger } from '../core/middleware/requestLogger';
 *   app.use(requestLogger);
 *
 * OUTPUT FORMAT (development):
 *   [2025-01-15 14:32:01] [INFO ] → POST   /payments/create-order
 *   [2025-01-15 14:32:01] [INFO ] ← POST   /payments/create-order  200  142ms
 *   [2025-01-15 14:32:05] [WARN ] ← POST   /admin/login            401   38ms
 *   [2025-01-15 14:32:10] [ERROR] ← POST   /payments/webhook       500   12ms
 *
 * HOW TO DEBUG:
 * - If a request appears in logs but returns wrong status, the issue is in
 *   a controller or service — the request reached the server fine.
 * - If a request does NOT appear in logs at all, the issue is in your
 *   network, CORS config, or the request never left the client.
 * - Response time over 2000ms usually means a slow DB query. Add logger.debug()
 *   calls around your service DB calls to narrow it down.
 * - Skipped paths (health check) are configurable below.
 *
 * WHAT IS LOGGED:
 * - Incoming: method + URL (logged immediately on arrival)
 * - Outgoing: method + URL + status code + response time in ms
 * - 4xx responses are logged as warn, 5xx as error, rest as info
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/logger.js';

// ─── Paths to skip logging (high-frequency, low-value) ───────────────────────

const SKIP_PATHS: string[] = [
  '/health',
  '/favicon.ico',
];

// ─── Middleware ───────────────────────────────────────────────────────────────

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Skip noisy paths
  if (SKIP_PATHS.includes(req.path)) {
    next();
    return;
  }

  const startTime = Date.now();
  const method = req.method.padEnd(6); // Pad for alignment: "POST  " "GET   "
  const url = req.originalUrl;

  // Log the incoming request immediately (before processing)
  logger.debug(`→ ${method} ${url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Hook into the response finish event to log the outcome
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const statusStr = String(status);
    const durationStr = `${duration}ms`.padStart(7);

    const summary = `← ${method} ${url.padEnd(45)} ${statusStr}  ${durationStr}`;

    if (status >= 500) {
      logger.error(summary);
    } else if (status >= 400) {
      logger.warn(summary);
    } else {
      logger.info(summary);
    }
  });

  next();
};