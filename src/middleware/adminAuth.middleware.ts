/**
 * Admin Authentication Middleware
 * 
 * Protects admin-only routes by verifying JWT token.
 * Attaches admin info to request object if valid.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAdminAccessToken } from '../services/token.service';
import { Admin } from '../models/Admin.model';
import { ApiError } from './error.middleware';
import { logger } from '../utils/logger';

/**
 * Middleware to verify admin authentication
 * Must be used on all admin-only routes
 */
export const adminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Please provide a valid token.');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    let decoded;
    try {
      decoded = verifyAdminAccessToken(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Token expired') {
          throw new ApiError(401, 'Token expired. Please login again.');
        }
        if (error.message === 'Invalid token') {
          throw new ApiError(401, 'Invalid token. Please login again.');
        }
      }
      throw new ApiError(401, 'Authentication failed');
    }
    
    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      logger.warn(`Token used for non-existent admin: ${decoded.id}`);
      throw new ApiError(401, 'Admin account not found');
    }
    
    if (!admin.isActive) {
      logger.warn(`Token used for deactivated admin: ${decoded.email}`);
      throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }
    
    // Attach admin to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional middleware for routes that can be accessed by both
 * authenticated and unauthenticated users (rare for admin routes)
 */
export const optionalAdminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = verifyAdminAccessToken(token);
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (admin && admin.isActive) {
          req.admin = {
            id: admin.id,
            email: admin.email,
            role: admin.role,
          };
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};