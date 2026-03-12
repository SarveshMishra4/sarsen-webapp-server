import mongoose from 'mongoose';
import { Feedback, IFeedback } from './feedback.model.js';
import { Engagement } from '../engagements/engagement.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { notificationService } from '../notifications/notification.service.js';

export const feedbackService = {

  /**
   * submitFeedback
   *
   * User submits a rating and optional comments for a delivered engagement.
   *
   * Rules:
   * - Engagement must exist and belong to the user
   * - Engagement must be in 'delivered' status
   * - Only one feedback per engagement — 409 if already submitted
   */
  async submitFeedback(
    engagementId: string,
    userId: string,
    data: { rating: number; comments?: string }
  ): Promise<IFeedback> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.userId.toString() !== userId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    if (engagement.status !== 'delivered') {
      throw new AppError(
        'Feedback can only be submitted after the engagement has been delivered.',
        403
      );
    }

    const existing = await Feedback.findOne({ engagementId });
    if (existing) {
      throw new AppError('Feedback has already been submitted for this engagement.', 409);
    }

    const feedback = await Feedback.create({
      engagementId,
      userId,
      rating:   data.rating,
      // FIX: Only insert the 'comments' key if data.comments actually exists. 
      // This prevents passing { comments: undefined } to Mongoose.
      ...(data.comments !== undefined ? { comments: data.comments } : {})
    });

    logger.info('[Feedback] Feedback submitted', {
      engagementId,
      userId,
      rating: data.rating,
    });

    // Notify admin that feedback was submitted
    // Note: Intentionally not using 'await' to avoid blocking the response
    notificationService.createNotification({
      recipientId:   'admin-global',
      recipientRole: 'admin',
      type:          'feedback_submitted',
      message:       `User submitted feedback with a rating of ${data.rating}/5.`,
      engagementId:  engagementId,
    });

    return feedback;
  },

  /**
   * getAllFeedback
   *
   * Admin retrieves all feedback across all engagements.
   * Populates user email and service title for context.
   */
  async getAllFeedback(): Promise<IFeedback[]> {
    return Feedback.find()
      .populate('userId', 'email')
      .populate('engagementId', 'status')
      .sort({ createdAt: -1 });
  },

  /**
   * getFeedbackForEngagement
   *
   * Admin retrieves feedback for a specific engagement.
   * Returns null if no feedback has been submitted yet.
   */
  async getFeedbackForEngagement(engagementId: string): Promise<IFeedback | null> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    return Feedback.findOne({ engagementId })
      .populate('userId', 'email');
  },
};