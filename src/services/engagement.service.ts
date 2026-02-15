/**
 * Engagement Service
 * 
 * Contains business logic for managing engagements:
 * - Creating engagements from blueprints after payment
 * - Fetching engagements for clients and admins
 * - Updating engagement status and progress
 * - Generating engagement IDs
 */

import { Engagement, IEngagement } from '../models/Engagement.model';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import * as blueprintService from './blueprint.service';
import * as clientAuthService from './clientAuth.service';
import * as progressService from './progress.service'; // PHASE 8: Import progress service
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import { 
  MILESTONES, 
  DEFAULT_STARTING_MILESTONE, 
  ALLOWED_MILESTONES,
  MilestoneType,
  isValidMilestone,
  getAllowedTransitions,
  getNextRecommendedMilestone,
  getMilestoneLabel // FIXED: Added missing import
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
): Promise<IEngagement> => {
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
    
    if (!userId) {
      // Generate a secure random password for new user
      const { generateSecurePassword } = await import('../utils/token.util');
      const tempPassword = generateSecurePassword();
      
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
    
    logger.info(`Engagement created successfully: ${engagementId} for user: ${email}`);
    
    return engagement[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get engagement by ID
 * @param engagementId - Engagement ID or MongoDB _id
 * @returns Engagement with populated user data
 */
export const getEngagementById = async (
  engagementId: string
): Promise<IEngagement | null> => {
  try {
    // Check if it's a MongoDB ObjectId or our custom engagementId
    const isObjectId = mongoose.Types.ObjectId.isValid(engagementId);
    
    const query = isObjectId
      ? { _id: engagementId }
      : { engagementId };
    
    return await Engagement.findOne(query)
      .populate('userId', 'email firstName lastName company')
      .populate('createdBy', 'email');
  } catch (error) {
    logger.error('Error fetching engagement by ID:', error);
    throw new ApiError(500, 'Failed to fetch engagement');
  }
};

/**
 * Get engagements for a client
 * @param userId - User ID
 * @returns Array of engagements
 */
export const getClientEngagements = async (
  userId: string
): Promise<IEngagement[]> => {
  try {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }
    
    return await Engagement.find({ userId })
      .sort({ createdAt: -1 })
      .select('engagementId serviceName currentProgress isCompleted messagingAllowed createdAt');
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
  } = {}
): Promise<{ engagements: IEngagement[]; total: number; pages: number }> => {
  try {
    const query: any = {};
    
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.isCompleted !== undefined) query.isCompleted = filters.isCompleted;
    if (filters.serviceCode) query.serviceCode = filters.serviceCode;
    
    const skip = (page - 1) * limit;
    
    const [engagements, total] = await Promise.all([
      Engagement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email firstName lastName company')
        .populate('createdBy', 'email'),
      Engagement.countDocuments(query),
    ]);
    
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
 * 
 * @deprecated Use progressService.updateProgress instead for better tracking
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
    
    // PHASE 8: Use progress service for validation and history
    // This maintains backward compatibility while leveraging new system
    const result = await progressService.updateProgress({
      engagementId: engagement._id.toString(),
      newProgress: validatedProgress,
      adminId,
      note,
      isAutomatic: false,
    });
    
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error updating engagement progress:', error);
    throw new ApiError(500, 'Failed to update engagement progress');
  }
};

/**
 * Get dashboard summary for admin
 * @returns Dashboard stats
 */
export const getAdminDashboardStats = async (): Promise<any> => {
  try {
    const [
      totalEngagements,
      activeEngagements,
      completedEngagements,
      recentEngagements,
      // PHASE 8: Add stalled engagements count
      stalledEngagements,
    ] = await Promise.all([
      Engagement.countDocuments(),
      Engagement.countDocuments({ isActive: true, isCompleted: false }),
      Engagement.countDocuments({ isCompleted: true }),
      Engagement.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'email firstName lastName')
        .select('engagementId serviceName currentProgress isCompleted createdAt'),
      // PHASE 8: Get stalled engagements (no progress in 7+ days)
      progressService.checkStalledEngagements(7).then(stalled => stalled.length),
    ]);
    
    return {
      totalEngagements,
      activeEngagements,
      completedEngagements,
      recentEngagements,
      stalledEngagements, // PHASE 8: New metric
    };
  } catch (error) {
    logger.error('Error fetching admin dashboard stats:', error);
    throw new ApiError(500, 'Failed to fetch dashboard stats');
  }
};

// PHASE 8: New helper functions

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
      label: getMilestoneLabel(nextValue), // FIXED: Now properly imported
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