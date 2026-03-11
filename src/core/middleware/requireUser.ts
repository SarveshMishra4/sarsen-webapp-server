/**
 * requireUser.ts
 *
 * Express middleware that protects user-facing authenticated routes.
 *
 * PURPOSE:
 * Verifies the JWT sent by the user, confirms it belongs to a user
 * (not admin), and attaches the user's ID and email to the request
 * object so controllers can use it without re-decoding the token.
 *
 * USAGE:
 * Apply to any route that requires a logged-in user:
 *   import { requireUser } from '../core/middleware/requireUser';
 *   router.get('/engagements', requireUser, engagementController.getAll);
 *
 * HOW TO DEBUG:
 * - "Authorization token missing" → client did not send Authorization header.
 *   Check that frontend sends: Authorization: Bearer <token>
 * - "Invalid or expired token" → token is malformed or has expired (30d).
 *   User needs to log in again to get a fresh token.
 * - "Access denied — users only" → an admin token was used on a user route.
 *   This should not happen in normal use. Check which token the client stored.
 * - After this middleware runs, req.userId and req.userEmail are always set.
 *   If they appear undefined in a controller, that route is missing this middleware.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { formatResponse } from '../utils/formatResponse.js';
import { env } from '../config/env.js';

// ─── JWT Payload Shape ───────────────────────────────────────────────────────

interface UserJwtPayload {
  id: string;
  role: 'user' | 'admin';
  email: string;
  iat: number;
  exp: number;
}

// ─── Extend Express Request ───────────────────────────────────────────────────
// Adds userId and userEmail to every request that passes this middleware.
// These are guaranteed non-null after requireUser runs.

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      // adminId and adminEmail declared in requireAdmin.ts
    }
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const requireUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Authorization token missing. Include "Authorization: Bearer <token>" in your request headers.',
        401
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      throw new AppError('Authorization token is empty.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as UserJwtPayload;

    // Reject admin tokens on user routes
    if (decoded.role !== 'user') {
      throw new AppError('Access denied — this endpoint is for users only.', 403);
    }

    // Attach to request for use in controllers
    req.userId = decoded.id;
    req.userEmail = decoded.email;

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json(
        formatResponse(false, 'Your session has expired. Please log in again.')
      );
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json(
        formatResponse(false, 'Invalid token. Please log in again.')
      );
      return;
    }

    next(err);
  }
};