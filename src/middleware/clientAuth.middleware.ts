/**
 * Client Authentication Middleware
 * 
 * Protects client routes by verifying JWT token.
 * Attaches client info to request object if valid.
 * Ensures client can only access their own engagement.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyClientAccessToken } from '../services/token.service'; // CHANGED: Use client-specific verifier
import { User } from '../models/User.model';
import { ApiError } from './error.middleware';
import { logger } from '../utils/logger';

/**
 * Middleware to verify client authentication
 * Must be used on all client routes
 */
export const clientAuthMiddleware = async (
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
    
    // Verify token using client-specific verifier
    let decoded;
    try {
      // CHANGED: Use verifyClientAccessToken instead of verifyAdminAccessToken
      decoded = verifyClientAccessToken(token);
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
    
    // No need to check role here - verifyClientAccessToken already ensures it's CLIENT
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.id);
    
    if (!user) {
      logger.warn(`Token used for non-existent user: ${decoded.id}`);
      throw new ApiError(401, 'User account not found');
    }
    
    if (!user.isActive) {
      logger.warn(`Token used for deactivated user: ${decoded.email}`);
      throw new ApiError(403, 'Account is deactivated. Please contact support.');
    }
    
    // Attach client to request
    req.client = {
      id: user.id,
      email: user.email,
      engagementId: decoded.engagementId, // Now properly typed
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify client has access to specific engagement
 * Use after clientAuthMiddleware on routes that require engagement context
 * @param paramName - Name of the URL parameter containing engagement ID
 */
export const requireEngagementAccess = (paramName: string = 'engagementId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const engagementId = req.params[paramName];
      
      if (!engagementId) {
        throw new ApiError(400, 'Engagement ID is required');
      }
      
      // Check if client is authenticated
      if (!req.client) {
        throw new ApiError(401, 'Authentication required');
      }
      
      // Get user with engagements
      const user = await User.findById(req.client.id).select('engagements');
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      
      // Check if user has access to this engagement
      const hasAccess = user.engagements.some(
        (id) => id.toString() === engagementId
      );
      
      if (!hasAccess) {
        logger.warn(`User ${req.client.id} attempted to access unauthorized engagement: ${engagementId}`);
        throw new ApiError(403, 'You do not have access to this engagement');
      }
      
      // Attach engagement ID to request for downstream use
      req.client.engagementId = engagementId;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional client auth middleware
 * Doesn't fail if no token, but attaches client info if present
 */
export const optionalClientAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // CHANGED: Use verifyClientAccessToken here as well
        const decoded = verifyClientAccessToken(token);
        
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
          req.client = {
            id: user.id,
            email: user.email,
            engagementId: decoded.engagementId,
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