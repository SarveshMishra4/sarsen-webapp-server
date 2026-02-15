/**
 * Completion Middleware
 * 
 * Protects routes based on engagement completion status:
 * - Blocks dashboard access until feedback is submitted
 * - Enforces read-only mode after feedback
 * - Prevents messaging in completed engagements
 */

import { Request, Response, NextFunction } from 'express';
import * as completionService from '../services/completion.service';
import { ApiError } from './error.middleware';
import { logger } from '../utils/logger';

/**
 * Middleware to check if client can access engagement
 * Blocks access if engagement is completed and feedback not submitted
 */
export const requireFeedbackOrFullAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This middleware should be used after clientAuthMiddleware
    if (!req.client) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const engagementId = req.client.engagementId;
    
    if (!engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const canAccess = await completionService.canAccessEngagement(
      engagementId,
      req.client.id
    );
    
    if (!canAccess) {
      const status = await completionService.getCompletionStatus(engagementId);
      
      if (status.isCompleted && !status.hasFeedback) {
        // Redirect to feedback page
        res.status(403).json({
          success: false,
          message: 'Feedback required to continue',
          code: 'FEEDBACK_REQUIRED',
          data: {
            engagementId,
            requiresFeedback: true,
          },
        });
        return;
      }
      
      throw new ApiError(403, 'Access denied');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to enforce read-only mode for completed engagements
 * Prevents POST/PUT/PATCH/DELETE requests
 */
export const enforceReadOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This middleware should be used after clientAuthMiddleware
    if (!req.client) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const engagementId = req.client.engagementId;
    
    if (!engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const status = await completionService.getCompletionStatus(engagementId);
    
    // If completed and feedback submitted, enforce read-only
    if (status.isCompleted && status.hasFeedback) {
      // Allow GET requests, block others
      if (req.method !== 'GET') {
        throw new ApiError(403, 'Engagement is in read-only mode');
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if messaging is allowed
 * Blocks message sending in completed engagements
 */
export const requireMessagingAllowed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // This middleware should be used on message sending endpoints
    let engagementId: string | undefined;
    
    if (req.client) {
      engagementId = req.client.engagementId;
    } else if (req.admin) {
      // For admin, get engagementId from request body/params
      engagementId = req.body.engagementId || req.params.engagementId;
    }
    
    if (!engagementId) {
      throw new ApiError(400, 'Engagement ID not found');
    }
    
    const isAllowed = await completionService.isMessagingAllowed(engagementId);
    
    if (!isAllowed) {
      throw new ApiError(403, 'Messaging is disabled for this engagement');
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to redirect to feedback page if needed
 * Can be used on dashboard routes to ensure feedback is submitted
 */
export const redirectIfFeedbackRequired = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const engagementId = req.client.engagementId;
    
    if (!engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const status = await completionService.getCompletionStatus(engagementId);
    
    if (status.isCompleted && !status.hasFeedback) {
      // Instead of blocking, we can redirect in frontend by sending a special response
      res.status(200).json({
        success: true,
        data: {
          requiresFeedback: true,
          engagementId,
        },
        meta: {
          redirect: '/feedback',
        },
      });
      return;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};