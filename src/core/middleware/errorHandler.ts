/**
 * errorHandler.ts
 *
 * Global Express error handling middleware.
 *
 * PURPOSE:
 * Catches every error that propagates through next(err) in any controller.
 * Converts errors into clean, consistent API responses using formatResponse.
 * Logs detailed debug information so you can trace any failure.
 *
 * USAGE:
 * Register this LAST in app.ts, after all routes:
 *   import { errorHandler } from '../core/middleware/errorHandler';
 *   app.use(errorHandler);
 *
 * HOW ERRORS FLOW:
 * Controller throws or calls next(err)
 *   → errorHandler catches it
 *   → if AppError: use its message and statusCode
 *   → if Mongoose error: translate to readable message
 *   → if JWT error: return 401
 *   → if unknown: return 500 and log full details
 *
 * RESPONSE FORMAT (always uses formatResponse):
 *   { success: false, message: "Human-readable message" }
 *   In development: also includes { stack } for debugging
 *
 * HOW TO DEBUG:
 * - Every 500 error logs the full stack trace via logger.error().
 * - Check terminal output whenever you get an unexpected 500.
 * - If you get "Cast to ObjectId failed" it means an invalid MongoDB ID
 *   was passed in a URL param — validate params with Zod in your controllers.
 * - If you get "duplicate key error" it means a unique field was violated
 *   (e.g. registering with an already-used email).
 * - If you get "Validation failed" it is a Mongoose schema validation error —
 *   this means data reached the model without going through Zod first.
 *
 * ERROR TYPE REFERENCE:
 * - AppError           → your own thrown errors (e.g. throw new AppError('Not found', 404))
 * - Mongoose Cast      → invalid ObjectId in URL param or query
 * - Mongoose Duplicate → unique index violation (email already exists, etc.)
 * - Mongoose Validate  → schema validation failed (data bypassed Zod)
 * - JWT errors         → token missing, invalid, or expired
 * - Unknown            → anything else — logged in full, returns 500
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { formatResponse } from '../utils/formatResponse.js';
import { logger } from '../logger/logger.js';
import { env } from '../config/env.js';

// ─── Error Handler Middleware ────────────────────────────────────────────────

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ── AppError (your own thrown errors) ──────────────────────────────────────
  if (err instanceof AppError) {
    logger.warn(`[ErrorHandler] AppError — ${err.statusCode} — ${err.message}`, {
      path: req.originalUrl,
      method: req.method,
    });

    res.status(err.statusCode).json(
      formatResponse(false, err.message)
    );
    return;
  }

  // ── Mongoose: Invalid ObjectId ─────────────────────────────────────────────
  // Happens when a URL param like /engagements/:id receives "abc" instead of a valid ObjectId
  if (err instanceof mongoose.Error.CastError) {
    const message = `Invalid value for field "${err.path}". Expected a valid ID.`;
    logger.warn(`[ErrorHandler] CastError — ${message}`, { path: req.originalUrl });
    res.status(400).json(formatResponse(false, message));
    return;
  }

  // ── Mongoose: Duplicate Key (unique index violation) ───────────────────────
  // Happens when inserting a document with a field value that already exists (e.g. email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    const value = err.keyValue?.[field] ?? '';
    const message = `"${value}" is already registered. Please use a different ${field}.`;
    logger.warn(`[ErrorHandler] Duplicate key — ${message}`, { path: req.originalUrl });
    res.status(409).json(formatResponse(false, message));
    return;
  }

  // ── Mongoose: Validation Error ─────────────────────────────────────────────
  // Happens when data reaches the model without being validated by Zod first.
  // This should rarely happen if Zod validators are in place.
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(', ');
    logger.warn(`[ErrorHandler] Mongoose ValidationError — ${messages}`, {
      path: req.originalUrl,
    });
    res.status(400).json(formatResponse(false, `Validation failed: ${messages}`));
    return;
  }

  // ── JWT: Token Invalid or Malformed ───────────────────────────────────────
  if (err instanceof jwt.JsonWebTokenError) {
    logger.warn('[ErrorHandler] JWT error — invalid or malformed token', {
      path: req.originalUrl,
    });
    res.status(401).json(formatResponse(false, 'Invalid or expired token. Please log in again.'));
    return;
  }

  // ── JWT: Token Expired ────────────────────────────────────────────────────
  if (err instanceof jwt.TokenExpiredError) {
    logger.warn('[ErrorHandler] JWT expired', { path: req.originalUrl });
    res.status(401).json(formatResponse(false, 'Your session has expired. Please log in again.'));
    return;
  }

  // ── Zod Validation Error (if used directly outside controllers) ───────────
  // Normally Zod errors are handled inside each controller, but just in case.
  if (err.name === 'ZodError') {
    const message = err.errors?.[0]?.message ?? 'Validation error';
    logger.warn(`[ErrorHandler] ZodError — ${message}`, { path: req.originalUrl });
    res.status(400).json(formatResponse(false, message));
    return;
  }

  // ── Unknown / Unhandled Error (500) ───────────────────────────────────────
  // Log the full error for debugging. Never expose raw error details to client.
  logger.error(`[ErrorHandler] Unhandled error on ${req.method} ${req.originalUrl}`, err);

  // In development: include stack trace in response to speed up debugging
  const responseData = env.IS_DEVELOPMENT
    ? { stack: err.stack, raw: err.message }
    : undefined;

  res.status(500).json(
    formatResponse(
      false,
      'Something went wrong on our end. Please try again or contact support.',
      responseData
    )
  );
};