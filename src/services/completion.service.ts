/**
 * Completion Service
 * 
 * Handles engagement completion workflow:
 * - Automatically disables messaging at 100%
 * - Enforces feedback requirement
 * - Manages read-only access after feedback
 * - Provides completion status checks
 */

import { Engagement } from '../models/Engagement.model';
import * as feedbackService from './feedback.service';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface CompletionStatus {
  isCompleted: boolean;
  hasFeedback: boolean;
  canAccess: boolean; // Whether client can access dashboard
  accessMode: 'full' | 'feedback-required' | 'read-only';
  completedAt?: Date;
  feedbackSubmittedAt?: Date;
}

/**
 * Handle engagement completion automatically
 * Called when progress reaches 100%
 * @param engagementId - Engagement ID
 */
export const handleCompletion = async (engagementId: string): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const engagement = await Engagement.findById(engagementId).session(session);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    // Mark as completed if not already
    if (!engagement.isCompleted) {
      engagement.isCompleted = true;
      engagement.completedAt = new Date();
    }
    
    // CRITICAL: Disable messaging permanently
    engagement.messagingAllowed = false;
    
    await engagement.save({ session });
    
    logger.info(`Engagement ${engagementId} completed and messaging disabled`);
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error handling engagement completion:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get completion status for an engagement
 * @param engagementId - Engagement ID
 * @returns Completion status object
 */
export const getCompletionStatus = async (
  engagementId: string
): Promise<CompletionStatus> => {
  try {
    const engagement = await Engagement.findById(engagementId);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    const hasFeedback = await feedbackService.hasFeedback(engagementId);
    
    let accessMode: 'full' | 'feedback-required' | 'read-only' = 'full';
    let canAccess = true;
    
    if (engagement.isCompleted) {
      if (!hasFeedback) {
        accessMode = 'feedback-required';
        canAccess = false; // Block access until feedback submitted
      } else {
        accessMode = 'read-only';
        canAccess = true; // Read-only access after feedback
      }
    }
    
    return {
      isCompleted: engagement.isCompleted,
      hasFeedback,
      canAccess,
      accessMode,
      completedAt: engagement.completedAt,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error getting completion status:', error);
    throw new ApiError(500, 'Failed to get completion status');
  }
};

/**
 * Check if client can access engagement
 * Used by middleware to block dashboard access
 * @param engagementId - Engagement ID
 * @param userId - User ID
 * @returns Boolean indicating if access is allowed
 */
export const canAccessEngagement = async (
  engagementId: string,
  userId: string
): Promise<boolean> => {
  try {
    const engagement = await Engagement.findOne({
      _id: engagementId,
      userId,
    });
    
    if (!engagement) {
      return false;
    }
    
    // If not completed, full access
    if (!engagement.isCompleted) {
      return true;
    }
    
    // If completed, check if feedback submitted
    const hasFeedback = await feedbackService.hasFeedback(engagementId);
    
    // Allow access only if feedback submitted (read-only)
    return hasFeedback;
  } catch (error) {
    logger.error('Error checking engagement access:', error);
    return false;
  }
};

/**
 * Get access mode for client
 * @param engagementId - Engagement ID
 * @returns Access mode description
 */
export const getAccessMode = async (
  engagementId: string
): Promise<{
  mode: 'full' | 'feedback-required' | 'read-only';
  message: string;
}> => {
  try {
    const engagement = await Engagement.findById(engagementId);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    if (!engagement.isCompleted) {
      return {
        mode: 'full',
        message: 'Full engagement access',
      };
    }
    
    const hasFeedback = await feedbackService.hasFeedback(engagementId);
    
    if (!hasFeedback) {
      return {
        mode: 'feedback-required',
        message: 'Please submit your feedback to continue',
      };
    }
    
    return {
      mode: 'read-only',
      message: 'Engagement completed - read-only access',
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error getting access mode:', error);
    throw new ApiError(500, 'Failed to get access mode');
  }
};

/**
 * Verify if messaging is allowed for engagement
 * @param engagementId - Engagement ID
 * @returns Boolean indicating if messaging is allowed
 */
export const isMessagingAllowed = async (
  engagementId: string
): Promise<boolean> => {
  try {
    const engagement = await Engagement.findById(engagementId).select('messagingAllowed isCompleted');
    
    if (!engagement) {
      return false;
    }
    
    // Messaging allowed only if not completed and flag is true
    return !engagement.isCompleted && engagement.messagingAllowed;
  } catch (error) {
    logger.error('Error checking messaging allowed:', error);
    return false;
  }
};

/**
 * Get all completed engagements without feedback
 * For admin reminders and reporting
 * @returns Array of engagements needing feedback
 */
export const getEngagementsNeedingFeedback = async (): Promise<any[]> => {
  try {
    const completedEngagements = await Engagement.find({
      isCompleted: true,
    }).select('_id engagementId serviceName userId completedAt');
    
    const engagementsNeedingFeedback = [];
    
    for (const engagement of completedEngagements) {
      const hasFeedback = await feedbackService.hasFeedback(engagement._id.toString());
      if (!hasFeedback) {
        engagementsNeedingFeedback.push(engagement);
      }
    }
    
    return engagementsNeedingFeedback;
  } catch (error) {
    logger.error('Error fetching engagements needing feedback:', error);
    throw new ApiError(500, 'Failed to fetch engagements needing feedback');
  }
};