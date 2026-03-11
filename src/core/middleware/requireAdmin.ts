import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError.js';
import { formatResponse } from '../utils/formatResponse.js';

// Define the custom shape of your JWT payload
interface AdminJwtPayload {
  id: string;
  role: 'admin' | 'user';
  email: string;
}

// Extend Express Request to carry admin identity globally
declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      adminEmail?: string;
    }
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. Extract the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token missing', 401);
    }

    // 2. Split the header to get the actual token string
    const token = authHeader.split(' ')[1];
    
    // Fix for ts(2769): Prove to strict TypeScript that the token actually exists 
    // after splitting the array, in case the header was just "Bearer " with a space.
    if (!token) {
      throw new AppError('Token is missing from header', 401);
    }

    // 3. Ensure the secret exists in the environment variables
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('Server configuration error', 500);

    // 4. Verify the token (TypeScript now knows 'token' and 'secret' are both solid strings)
    const decoded = jwt.verify(token, secret);

    // 5. Runtime safety: Ensure the decoded token is an object, not just a plain string
    if (typeof decoded === 'string') {
      throw new AppError('Invalid token format', 401);
    }

    // 6. Fix for ts(2352): Double-cast to override TypeScript's strict overlap rules.
    // We safely force it to trust our custom interface since we just proved it's an object above.
    const payload = decoded as unknown as AdminJwtPayload;

    // 7. Verify the user actually has admin privileges
    if (payload.role !== 'admin') {
      throw new AppError('Access denied - admin only', 403);
    }

    // 8. Attach the safe, typed data to the Express request object
    req.adminId = payload.id;
    req.adminEmail = payload.email;

    // Proceed to the actual route handler!
    next();
  } catch (err) {
    // Catch specific JWT errors (like expired or tampered tokens)
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json(formatResponse(false, 'Invalid or expired token'));
      return;
    }
    // Pass any other unexpected errors to your global error handler
    next(err);
  }
};