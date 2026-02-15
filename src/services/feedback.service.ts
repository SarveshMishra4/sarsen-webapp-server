/**
 * Feedback Service
 * 
 * Contains business logic for managing feedback:
 * - Submitting feedback after engagement completion
 * - Retrieving feedback for admin
 * - Feedback analytics and aggregation
 * - Testimonial management
 */

import { Feedback, IFeedback, FeedbackRating } from '../models/Feedback.model';
import { Engagement } from '../models/Engagement.model';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface SubmitFeedbackInput {
  engagementId: string;
  userId: string;
  rating: FeedbackRating;
  review?: string;
  wouldRecommend: boolean;
  wouldUseAgain: boolean;
  communication?: FeedbackRating;
  quality?: FeedbackRating;
  timeliness?: FeedbackRating;
  value?: FeedbackRating;
  whatWorkedWell?: string[];
  whatCouldBeImproved?: string[];
  additionalComments?: string;
  allowTestimonial?: boolean;
  testimonial?: string;
  timeSpent?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface FeedbackFilters {
  rating?: FeedbackRating;
  startDate?: Date;
  endDate?: Date;
  isHighlighted?: boolean;
  page?: number;
  limit?: number;
}

export interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recommendRate: number;
  wouldUseAgainRate: number;
  averageCommunication?: number;
  averageQuality?: number;
  averageTimeliness?: number;
  averageValue?: number;
  commonPraises: string[];
  commonImprovements: string[];
}

/**
 * Submit feedback for a completed engagement
 * @param input - Feedback input data
 * @returns Submitted feedback
 */
export const submitFeedback = async (
  input: SubmitFeedbackInput
): Promise<IFeedback> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { engagementId, userId, ...feedbackData } = input;
    
    // Check if engagement exists and is completed
    const engagement = await Engagement.findById(engagementId).session(session);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    if (!engagement.isCompleted) {
      throw new ApiError(400, 'Feedback can only be submitted for completed engagements');
    }
    
    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ engagementId }).session(session);
    
    if (existingFeedback) {
      throw new ApiError(400, 'Feedback already submitted for this engagement');
    }
    
    // Verify user owns this engagement
    if (engagement.userId.toString() !== userId) {
      throw new ApiError(403, 'You do not have permission to submit feedback for this engagement');
    }
    
    // Create feedback
    const [feedback] = await Feedback.create([{
      engagementId,
      userId,
      ...feedbackData,
      submittedAt: new Date(),
    }], { session });
    
    // Mark engagement as feedback submitted (optional flag)
    // Could add a feedbackSubmitted flag to engagement if needed
    
    await session.commitTransaction();
    
    logger.info(`Feedback submitted for engagement ${engagementId} with rating ${feedbackData.rating}`);
    
    return feedback;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Check if feedback has been submitted for an engagement
 * @param engagementId - Engagement ID
 * @returns Boolean indicating if feedback exists
 */
export const hasFeedback = async (engagementId: string): Promise<boolean> => {
  try {
    const count = await Feedback.countDocuments({ engagementId });
    return count > 0;
  } catch (error) {
    logger.error('Error checking feedback existence:', error);
    throw new ApiError(500, 'Failed to check feedback status');
  }
};

/**
 * Get feedback by engagement ID
 * @param engagementId - Engagement ID
 * @returns Feedback or null
 */
export const getFeedbackByEngagement = async (
  engagementId: string
): Promise<IFeedback | null> => {
  try {
    return await Feedback.findOne({ engagementId })
      .populate('userId', 'email firstName lastName company')
      .populate('engagementId', 'engagementId serviceName');
  } catch (error) {
    logger.error('Error fetching feedback by engagement:', error);
    throw new ApiError(500, 'Failed to fetch feedback');
  }
};

/**
 * Get all feedback (admin) with pagination and filters
 * @param filters - Optional filters
 * @returns Paginated feedback with stats
 */
export const getAllFeedback = async (
  filters: FeedbackFilters = {}
): Promise<{ feedback: IFeedback[]; total: number; pages: number; stats: FeedbackStats }> => {
  try {
    const { rating, startDate, endDate, isHighlighted, page = 1, limit = 20 } = filters;
    
    const query: any = {};
    
    if (rating) query.rating = rating;
    if (isHighlighted !== undefined) query.isHighlighted = isHighlighted;
    
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = startDate;
      if (endDate) query.submittedAt.$lte = endDate;
    }
    
    const skip = (page - 1) * limit;
    
    // Get paginated feedback
    const [feedback, total] = await Promise.all([
      Feedback.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email firstName lastName company')
        .populate('engagementId', 'engagementId serviceName'),
      Feedback.countDocuments(query),
    ]);
    
    // Calculate stats
    const stats = await getFeedbackStats(query);
    
    return {
      feedback,
      total,
      pages: Math.ceil(total / limit),
      stats,
    };
  } catch (error) {
    logger.error('Error fetching all feedback:', error);
    throw new ApiError(500, 'Failed to fetch feedback');
  }
};

/**
 * Get feedback statistics
 * @param query - MongoDB query for filtering
 * @returns Feedback statistics
 */
export const getFeedbackStats = async (query: any = {}): Promise<FeedbackStats> => {
  try {
    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: '$rating',
          },
          recommendCount: {
            $sum: { $cond: ['$wouldRecommend', 1, 0] },
          },
          useAgainCount: {
            $sum: { $cond: ['$wouldUseAgain', 1, 0] },
          },
          avgCommunication: { $avg: '$communication' },
          avgQuality: { $avg: '$quality' },
          avgTimeliness: { $avg: '$timeliness' },
          avgValue: { $avg: '$value' },
          allPraises: { $push: '$whatWorkedWell' },
          allImprovements: { $push: '$whatCouldBeImproved' },
        },
      },
    ];
    
    const result = await Feedback.aggregate(pipeline);
    
    if (result.length === 0) {
      return {
        totalCount: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recommendRate: 0,
        wouldUseAgainRate: 0,
        commonPraises: [],
        commonImprovements: [],
      };
    }
    
    const stats = result[0];
    
    // Calculate rating distribution
    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    // This would require a separate aggregation or we can compute from the data
    // For now, we'll leave it empty - can be enhanced later
    
    // Count common praises and improvements
    const praiseCount: Record<string, number> = {};
    const improvementCount: Record<string, number> = {};
    
    // Flatten and count arrays
    if (stats.allPraises) {
      stats.allPraises.flat().forEach((item: string) => {
        praiseCount[item] = (praiseCount[item] || 0) + 1;
      });
    }
    
    if (stats.allImprovements) {
      stats.allImprovements.flat().forEach((item: string) => {
        improvementCount[item] = (improvementCount[item] || 0) + 1;
      });
    }
    
    // Get top 5 common praises and improvements
    const commonPraises = Object.entries(praiseCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text);
    
    const commonImprovements = Object.entries(improvementCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text);
    
    return {
      totalCount: stats.totalCount,
      averageRating: Math.round(stats.averageRating * 10) / 10,
      ratingDistribution: ratingDist,
      recommendRate: Math.round((stats.recommendCount / stats.totalCount) * 100),
      wouldUseAgainRate: Math.round((stats.useAgainCount / stats.totalCount) * 100),
      averageCommunication: stats.avgCommunication ? Math.round(stats.avgCommunication * 10) / 10 : undefined,
      averageQuality: stats.avgQuality ? Math.round(stats.avgQuality * 10) / 10 : undefined,
      averageTimeliness: stats.avgTimeliness ? Math.round(stats.avgTimeliness * 10) / 10 : undefined,
      averageValue: stats.avgValue ? Math.round(stats.avgValue * 10) / 10 : undefined,
      commonPraises,
      commonImprovements,
    };
  } catch (error) {
    logger.error('Error calculating feedback stats:', error);
    throw new ApiError(500, 'Failed to calculate feedback statistics');
  }
};

/**
 * Toggle highlighted status for testimonial
 * @param feedbackId - Feedback ID
 * @param isHighlighted - Highlighted status
 * @returns Updated feedback
 */
export const toggleHighlighted = async (
  feedbackId: string,
  isHighlighted: boolean
): Promise<IFeedback> => {
  try {
    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }
    
    feedback.isHighlighted = isHighlighted;
    await feedback.save();
    
    logger.info(`Feedback ${feedbackId} highlighted status set to ${isHighlighted}`);
    
    return feedback;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error toggling feedback highlight:', error);
    throw new ApiError(500, 'Failed to update feedback');
  }
};

/**
 * Add admin notes to feedback
 * @param feedbackId - Feedback ID
 * @param notes - Admin notes
 * @returns Updated feedback
 */
export const addAdminNotes = async (
  feedbackId: string,
  notes: string
): Promise<IFeedback> => {
  try {
    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }
    
    feedback.adminNotes = notes;
    await feedback.save();
    
    return feedback;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error adding admin notes:', error);
    throw new ApiError(500, 'Failed to update feedback');
  }
};

/**
 * Delete feedback (admin only)
 * @param feedbackId - Feedback ID
 * @param adminId - Admin ID
 */
export const deleteFeedback = async (
  feedbackId: string,
  adminId: string
): Promise<void> => {
  try {
    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }
    
    await feedback.deleteOne();
    
    logger.info(`Feedback ${feedbackId} deleted by admin ${adminId}`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error deleting feedback:', error);
    throw new ApiError(500, 'Failed to delete feedback');
  }
};