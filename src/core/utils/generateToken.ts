/**
 * generateToken.ts
 *
 * JWT generation utility used across the backend.
 *
 * PURPOSE:
 * Single place where all JWTs are created. Ensures every token
 * has a consistent payload shape and uses the correct secret.
 *
 * TOKEN PAYLOAD SHAPE:
 *   { id: string, role: 'user' | 'admin', email: string }
 *
 * EXPIRY DEFAULTS:
 *   Users  → 30d  (pass explicitly or rely on default)
 *   Admins → 7d   (pass '7d' explicitly from admin service)
 *
 * USAGE:
 *   import { generateToken } from '../core/utils/generateToken';
 *
 *   // User token (30 day default)
 *   const token = generateToken({ id: user._id.toString(), role: 'user', email: user.email });
 *
 *   // Admin token (7 days explicit)
 *   const token = generateToken({ id: admin._id.toString(), role: 'admin', email: admin.email }, '7d');
 *
 * HOW TO DEBUG:
 * - "JWT_SECRET is not defined" → check your .env file. This is a fatal config error.
 * - To decode a token without verifying it (for inspection only):
 *     import jwt from 'jsonwebtoken';
 *     console.log(jwt.decode(token));
 * - To check expiry, look at the 'exp' field in the decoded payload (Unix timestamp).
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

interface TokenPayload {
  id: string;
  role: 'user' | 'admin';
  email: string;
}

export const generateToken = (
  payload: TokenPayload,
  expiresIn: string = '30d'
): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
};