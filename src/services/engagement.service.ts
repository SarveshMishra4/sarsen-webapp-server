/**
 * Engagement Service
 * 
 * Contains business logic for managing engagements:
 * - Creating engagements from blueprints after payment
 * - Fetching engagements for clients and admins
 * - Updating engagement status and progress
 * - Generating engagement IDs
 * - PHASE 9: Integrating completion and feedback workflow
 * - PHASE 10: Integrating notifications for dashboard events
 */

import { Engagement, IEngagement } from '../models/Engagement.model';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import * as blueprintService from './blueprint.service';
import * as clientAuthService from './clientAuth.service';
import * as progressService from './progress.service';
import * as completionService from './completion.service';
import * as feedbackService from './feedback.service';
import * as notificationService from './notification.service'; // PHASE 10: Import notification service
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import { EngagementSummary } from '../types/global';
import {
  MILESTONES,
  DEFAULT_STARTING_MILESTONE,
  ALLOWED_MILESTONES,
  MilestoneType,
  isValidMilestone,
  getAllowedTransitions,
  getNextRecommendedMilestone,
  getMilestoneLabel
} from '../constants/milestones';
import mongoose from 'mongoose';

export interface CreateEngagementInput {
  orderId: string; // Razorpay order ID
  email: string;
  serviceCode: string;
  userId?: string; // If user already existed
  userData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  };
}

// PHASE 9: Enhanced engagement response with completion status
export interface EngagementWithCompletion extends IEngagement {
  completionStatus?: {
    hasFeedback: boolean;
    accessMode: 'full' | 'feedback-required' | 'read-only';
    canAccess: boolean;
  };
}

/**
 * Generate a unique human-readable engagement ID
 * Format: ENG-YYYY-XXXXX (e.g., ENG-2024-00001)
 * @returns Unique engagement ID
 */
export const generateEngagementId = async (): Promise<string> => {
  const year = new Date().getFullYear();

  // Find the last engagement created this year
  const lastEngagement = await Engagement.findOne({
    engagementId: new RegExp(`^ENG-${year}-`),
  }).sort({ engagementId: -1 });

  let nextNumber = 1;

  if (lastEngagement) {
    const lastId = lastEngagement.engagementId;
    const lastNumber = parseInt(lastId.split('-')[2] || '0', 10);
    nextNumber = lastNumber + 1;
  }

  // Pad with zeros (e.g., 1 -> 00001)
  const paddedNumber = nextNumber.toString().padStart(5, '0');

  return `ENG-${year}-${paddedNumber}`;
};

/**
 * Create a new engagement after successful payment
 * @param input - Engagement creation input
 * @returns Created engagement
 */
export const createEngagementFromPayment = async (
  input: CreateEngagementInput
): Promise<{
  engagement: IEngagement;
  tempPassword?: string;
  isNewUser: boolean;
}> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, email, serviceCode, userData } = input;

    // 1. Get the order
    const order = await Order.findOne({ orderId }).session(session);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.status !== 'PAID') {
      throw new ApiError(400, 'Order is not paid');
    }

    // 2. Get or create user
    let userId = input.userId;
    let isNewUser = false;

    // ✅ ADDED: store temporary password outside block
    let generatedTempPassword: string | undefined;

    if (!userId) {
      // Generate a secure random password for new user
      const { generateSecurePassword } = await import('../utils/token.util');
      const tempPassword = generateSecurePassword();

      // ✅ ADDED: assign to outer variable
      generatedTempPassword = tempPassword;

      // Create user
      const user = await clientAuthService.createClientUser(
        email,
        tempPassword,
        userData
      );

      userId = user.id;
      isNewUser = true;

      // TODO: Send email with credentials to user
      logger.info(`New user created for engagement: ${email} with temp password`);
    }

    // Ensure userId is defined before proceeding
    if (!userId) {
      throw new ApiError(500, 'Failed to create or retrieve user account');
    }

    // 3. Get blueprint and clone it
    const blueprintClone = await blueprintService.cloneBlueprintForEngagement(serviceCode);

    if (!blueprintClone) {
      throw new ApiError(404, `No active blueprint found for service: ${serviceCode}`);
    }

    // 4. Generate engagement ID
    const engagementId = await generateEngagementId();

    // 5. Get system admin ID (or use a default/system account)
    // TODO: In production, you might want to have a dedicated system admin account
    const systemAdminId = new mongoose.Types.ObjectId(); // Placeholder

    // Ensure default progress is a valid MilestoneType
    const defaultProgress: MilestoneType =
      blueprintClone.defaultProgress && isValidMilestone(blueprintClone.defaultProgress)
        ? blueprintClone.defaultProgress as MilestoneType
        : DEFAULT_STARTING_MILESTONE;

    // 6. Create engagement from cloned blueprint
    const engagement = await Engagement.create([{
      engagementId,
      serviceCode: blueprintClone.serviceCode,
      serviceName: blueprintClone.serviceName,
      userId: new mongoose.Types.ObjectId(userId),
      createdBy: systemAdminId,
      blueprintId: blueprintClone.blueprintId,
      blueprintVersion: blueprintClone.blueprintVersion,

      // Clone content
      milestones: blueprintClone.milestones.map((m: any) => ({
        ...m,
        completedAt: m.value === DEFAULT_STARTING_MILESTONE ? new Date() : undefined,
      })),
      sections: blueprintClone.sections,
      resources: blueprintClone.resources.map((r: any) => ({
        ...r,
        addedAt: new Date(),
      })),

      // Use validated milestone value
      currentProgress: defaultProgress,
      messagingAllowed: blueprintClone.messagingEnabledByDefault,

      // Counters
      messageCount: 0,
      resourceCount: blueprintClone.resources?.length || 0,
      questionnaireCount: 0,

      // Use validated milestone value in history
      progressHistory: [{
        value: defaultProgress,
        updatedBy: systemAdminId,
        note: isNewUser ? 'Engagement created for new user' : 'Engagement created for existing user',
      }],

      startDate: new Date(),

    }], { session });

    // 7. Add engagement to user
    await clientAuthService.addEngagementToUser(userId, engagement[0].id);

    // 8. Update order with user and engagement IDs
    order.userId = new mongoose.Types.ObjectId(userId);
    order.engagementId = engagement[0]._id as mongoose.Types.ObjectId;
    await order.save({ session });

    // 9. Commit transaction
    await session.commitTransaction();

    // PHASE 10: Create notification for new engagement
    try {
      notificationService.onEngagementCreated({
        _id: engagement[0]._id,
        engagementId: engagement[0].engagementId,
        serviceName: engagement[0].serviceName,
      });
    } catch (notifError) {
      // Non-critical - don't fail the transaction
      logger.error('Failed to create engagement notification:', notifError);
    }

    logger.info(`Engagement created successfully: ${engagementId} for user: ${email}`);

    // ✅ MODIFIED RETURN: include credentials info
    return {
      engagement: engagement[0],
      tempPassword: isNewUser ? generatedTempPassword : undefined,
      isNewUser,
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get engagement by ID with completion status
 * @param engagementId - Engagement ID or MongoDB _id
 * @param includeCompletionStatus - Whether to include completion status
 * @returns Engagement with optional completion status
 */
export const getEngagementById = async (
  engagementId: string,
  includeCompletionStatus: boolean = false
): Promise<EngagementWithCompletion | null> => {
  try {
    // Check if it's a MongoDB ObjectId or our custom engagementId
    const engagement = await Engagement.findOne({ engagementId })
      .populate('userId', 'email firstName lastName company')
      .populate('createdBy', 'email');

    if (!engagement || !includeCompletionStatus) {
      return engagement;
    }

    // PHASE 9: Add completion status
    const completionStatus = await completionService.getCompletionStatus(
      engagement._id.toString()
    );

    // Convert to plain object and add completion status
    const engagementWithStatus = engagement.toObject() as EngagementWithCompletion;
    engagementWithStatus.completionStatus = completionStatus;

    return engagementWithStatus;
  } catch (error) {
    logger.error('Error fetching engagement by ID:', error);
    throw new ApiError(500, 'Failed to fetch engagement');
  }
};

/**
 * Get engagements for a client with completion status
 * @param userId - User ID
 * @param includeCompletionStatus - Whether to include completion status
 * @returns Array of engagements with optional completion status
 */
export const getClientEngagements = async (
  userId: string,
  includeCompletionStatus: boolean = false
): Promise<EngagementSummary[]> => {
  try {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    const engagements = await Engagement.find({ userId })
      .sort({ createdAt: -1 })
      .select(
        'engagementId serviceCode serviceName currentProgress isCompleted isActive messagingAllowed messageCount resourceCount questionnaireCount startDate updatedAt'
      )
      .lean();

    // We return EngagementSummary shape ONLY
    return engagements.map((engagement) => ({
      id: engagement._id.toString(),
      engagementId: engagement.engagementId,
      serviceCode: engagement.serviceCode,
      serviceName: engagement.serviceName,
      currentProgress: engagement.currentProgress,
      isCompleted: engagement.isCompleted,
      isActive: engagement.isActive,
      messagingAllowed: engagement.messagingAllowed,
      messageCount: engagement.messageCount,
      resourceCount: engagement.resourceCount,
      questionnaireCount: engagement.questionnaireCount,
      startDate: engagement.startDate,
      updatedAt: engagement.updatedAt,
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error fetching client engagements:', error);
    throw new ApiError(500, 'Failed to fetch engagements');
  }
};

/**
 * Get all engagements for admin (with pagination)
 * @param page - Page number
 * @param limit - Items per page
 * @param filters - Optional filters
 * @returns Paginated engagements
 */
export const getAllEngagements = async (
  page: number = 1,
  limit: number = 20,
  filters: {
    isActive?: boolean;
    isCompleted?: boolean;
    serviceCode?: string;
    hasFeedback?: boolean; // PHASE 9: New filter
  } = {}
): Promise<{ engagements: IEngagement[]; total: number; pages: number }> => {
  try {
    const query: any = {};

    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.isCompleted !== undefined) query.isCompleted = filters.isCompleted;
    if (filters.serviceCode) query.serviceCode = filters.serviceCode;

    const skip = (page - 1) * limit;

    let engagements = await Engagement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email firstName lastName company')
      .populate('createdBy', 'email');

    // PHASE 9: Filter by feedback status if requested
    if (filters.hasFeedback !== undefined) {
      const engagementIds = engagements.map(e => e._id.toString());
      const feedbackStatus = await Promise.all(
        engagementIds.map(async (id) => ({
          id,
          hasFeedback: await feedbackService.hasFeedback(id),
        }))
      );

      engagements = engagements.filter((eng, index) =>
        feedbackStatus[index].hasFeedback === filters.hasFeedback
      );
    }

    const total = await Engagement.countDocuments(query);

    return {
      engagements,
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error('Error fetching all engagements:', error);
    throw new ApiError(500, 'Failed to fetch engagements');
  }
};

/**
 * Update engagement progress
 * @param engagementId - Engagement ID
 * @param progress - New progress value (must be valid milestone)
 * @param adminId - Admin updating progress
 * @param note - Optional note
 * @returns Updated engagement
 */
export const updateEngagementProgress = async (
  engagementId: string,
  progress: number,
  adminId: string,
  note?: string
): Promise<IEngagement> => {
  try {
    if (!adminId) {
      throw new ApiError(400, 'Admin ID is required');
    }

    // Validate progress is a valid milestone and cast to MilestoneType
    if (!isValidMilestone(progress)) {
      throw new ApiError(
        400,
        `Invalid progress value. Allowed values: ${ALLOWED_MILESTONES.join(', ')}`
      );
    }

    // Now TypeScript knows progress is a valid MilestoneType
    const validatedProgress = progress as MilestoneType;

    // Find engagement
    const engagement = await Engagement.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(engagementId) ? engagementId : undefined },
        { engagementId },
      ].filter(Boolean),
    });

    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }

    // Use progress service for validation and history
    const result = await progressService.updateProgress({
      engagementId: engagement._id.toString(),
      newProgress: validatedProgress,
      adminId,
      note,
      isAutomatic: false,
    });

    // PHASE 9: If progress is 100%, trigger completion workflow
    if (validatedProgress === MILESTONES.COMPLETED) {
      await completionService.handleCompletion(engagement._id.toString());
      logger.info(`Completion workflow triggered for engagement ${engagementId}`);

      // PHASE 10: Create notification for engagement completion
      try {
        notificationService.onEngagementCompleted({
          _id: engagement._id,
          engagementId: engagement.engagementId,
          serviceName: engagement.serviceName,
        });
      } catch (notifError) {
        logger.error('Failed to create completion notification:', notifError);
      }
    }

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error updating engagement progress:', error);
    throw new ApiError(500, 'Failed to update engagement progress');
  }
};

/**
 * Get dashboard summary for admin with feedback stats
 * @returns Dashboard stats
 */
export const getAdminDashboardStats = async (): Promise<any> => {
  try {
    // PHASE 9: Get feedback stats
    const feedbackStats = await feedbackService.getFeedbackStats({});

    const [
      totalEngagements,
      activeEngagements,
      completedEngagements,
      recentEngagements,
      stalledEngagements,
      engagementsNeedingFeedback,
    ] = await Promise.all([
      Engagement.countDocuments(),
      Engagement.countDocuments({ isActive: true, isCompleted: false }),
      Engagement.countDocuments({ isCompleted: true }),
      Engagement.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'email firstName lastName')
        .select('engagementId serviceName currentProgress isCompleted createdAt'),
      progressService.checkStalledEngagements(7).then(stalled => stalled.length),
      completionService.getEngagementsNeedingFeedback().then(list => list.length),
    ]);

    // PHASE 10: Check for stalled engagements and create notifications
    if (stalledEngagements > 0) {
      // This would be better handled by a cron job, but for completeness:
      try {
        const stalledList = await progressService.checkStalledEngagements(7);
        stalledList.forEach(engagement => {
          notificationService.onStalledEngagement(engagement);
        });
      } catch (notifError) {
        logger.error('Failed to create stalled engagement notifications:', notifError);
      }
    }

    return {
      totalEngagements,
      activeEngagements,
      completedEngagements,
      recentEngagements,
      stalledEngagements,
      // PHASE 9: New metrics
      feedback: {
        totalCount: feedbackStats.totalCount,
        averageRating: feedbackStats.averageRating,
        recommendRate: feedbackStats.recommendRate,
        engagementsNeedingFeedback,
      },
    };
  } catch (error) {
    logger.error('Error fetching admin dashboard stats:', error);
    throw new ApiError(500, 'Failed to fetch dashboard stats');
  }
};

/**
 * Get next recommended milestone for an engagement
 * @param engagementId - Engagement ID
 * @returns Next recommended milestone or null
 */
export const getNextMilestone = async (
  engagementId: string
): Promise<{ value: number; label: string } | null> => {
  try {
    const engagement = await Engagement.findById(engagementId);
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }

    const nextValue = getNextRecommendedMilestone(engagement.currentProgress as MilestoneType);
    if (!nextValue) return null;

    return {
      value: nextValue,
      label: getMilestoneLabel(nextValue),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error getting next milestone:', error);
    throw new ApiError(500, 'Failed to get next milestone');
  }
};

/**
 * Get progress summary for multiple engagements
 * @param engagementIds - Array of engagement IDs
 * @returns Progress summary
 */
export const getProgressSummary = async (
  engagementIds: string[]
): Promise<Record<string, any>> => {
  try {
    const engagements = await Engagement.find({
      _id: { $in: engagementIds },
    }).select('engagementId currentProgress isCompleted');

    const summary: Record<string, any> = {};

    engagements.forEach(eng => {
      summary[eng.engagementId] = {
        currentProgress: eng.currentProgress,
        isCompleted: eng.isCompleted,
        progressPercentage: eng.currentProgress,
        nextMilestone: getNextRecommendedMilestone(eng.currentProgress as MilestoneType),
      };
    });

    return summary;
  } catch (error) {
    logger.error('Error getting progress summary:', error);
    throw new ApiError(500, 'Failed to get progress summary');
  }
};

// PHASE 9: New helper functions

/**
 * Check if engagement requires feedback
 * @param engagementId - Engagement ID
 * @returns Boolean indicating if feedback is required
 */
export const requiresFeedback = async (engagementId: string): Promise<boolean> => {
  try {
    const engagement = await Engagement.findById(engagementId);
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }

    if (!engagement.isCompleted) {
      return false;
    }

    const hasFeedback = await feedbackService.hasFeedback(engagementId);
    return !hasFeedback;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error checking feedback requirement:', error);
    throw new ApiError(500, 'Failed to check feedback requirement');
  }
};

/**
 * Get engagement access information for client
 * @param engagementId - Engagement ID
 * @param userId - User ID
 * @returns Access information
 */
export const getEngagementAccess = async (
  engagementId: string,
  userId: string
): Promise<{
  canAccess: boolean;
  accessMode: 'full' | 'feedback-required' | 'read-only';
  requiresFeedback: boolean;
  isCompleted: boolean;
}> => {
  try {
    const engagement = await Engagement.findOne({ _id: engagementId, userId });

    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }

    const canAccess = await completionService.canAccessEngagement(engagementId, userId);
    const accessMode = (await completionService.getAccessMode(engagementId)).mode;

    // FIXED: Renamed variable to avoid naming collision
    const isFeedbackRequired = await requiresFeedback(engagementId);

    return {
      canAccess,
      accessMode,
      requiresFeedback: isFeedbackRequired,
      isCompleted: engagement.isCompleted,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error getting engagement access:', error);
    throw new ApiError(500, 'Failed to get engagement access');
  }
};