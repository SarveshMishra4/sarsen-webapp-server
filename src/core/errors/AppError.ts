/**
 * AppError.ts
 *
 * Custom error class for all known, expected application errors.
 *
 * PURPOSE:
 * Differentiates between errors YOU intentionally throw (operational errors)
 * and unexpected crashes (programming errors). The errorHandler middleware
 * uses this distinction to decide how to respond and how much to log.
 *
 * USAGE:
 * Throw this anywhere in services or controllers for expected failure cases:
 *   throw new AppError('Service not found', 404);
 *   throw new AppError('Invalid coupon code', 400);
 *   throw new AppError('Engagement already delivered', 409);
 *
 * COMMON STATUS CODES:
 *   400 — Bad request (invalid input, failed validation)
 *   401 — Unauthorized (no token or invalid token)
 *   403 — Forbidden (valid token but wrong role or permission)
 *   404 — Not found (resource does not exist)
 *   409 — Conflict (duplicate, already exists, state mismatch)
 *   422 — Unprocessable (input valid but business rule violated)
 *   500 — Internal server error (use sparingly — prefer specific codes)
 *
 * HOW TO DEBUG:
 * If you get an AppError you didn't expect, search the codebase for the
 * exact message string — that will show you exactly where it was thrown.
 *
 * isOperational = true  → expected error, no alarm needed
 * isOperational = false → unexpected crash, investigate immediately
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;

    // Captures a clean stack trace pointing to the throw site, not this constructor
    Error.captureStackTrace(this, this.constructor);
  }
}