import mongoose from 'mongoose';
import { Engagement, IEngagement } from './engagement.model.js';
import { AppError } from '../../core/errors/AppError.js';

export const engagementService = {

  // ─── User Endpoints ───────────────────────────────────────────────────────

  /**
   * Get all engagements belonging to a specific user.
   * Users only ever see their own — userId is taken from the JWT, never the request body.
   */
  async getUserEngagements(userId: string): Promise<IEngagement[]> {
    return Engagement.find({ userId })
      .populate('serviceId', 'title type description')
      .populate('couponId', 'code price')
      .sort({ createdAt: -1 });
  },

  /**
   * Get a single engagement by ID for a specific user.
   * Returns 404 if not found, 403 if the engagement belongs to a different user.
   */
  async getUserEngagementById(engagementId: string, userId: string): Promise<IEngagement> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId)
      .populate('serviceId', 'title type description')
      .populate('couponId', 'code price');

    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.userId.toString() !== userId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    return engagement;
  },

  // ─── Admin Endpoints ──────────────────────────────────────────────────────

  /**
   * Get all engagements across all users.
   * Admin only — no userId filter applied.
   */
  async getAllEngagements(): Promise<IEngagement[]> {
    return Engagement.find()
      .populate('userId', 'email')
      .populate('serviceId', 'title type')
      .populate('couponId', 'code price')
      .sort({ createdAt: -1 });
  },

  /**
   * Get a single engagement by ID — admin has access to any engagement.
   */
  async getEngagementByIdAdmin(engagementId: string): Promise<IEngagement> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId)
      .populate('userId', 'email')
      .populate('serviceId', 'title type description')
      .populate('couponId', 'code price');

    if (!engagement) throw new AppError('Engagement not found', 404);

    return engagement;
  },

  // ─── Internal Utility ─────────────────────────────────────────────────────

  /**
   * Used by other services (messaging, checklist, questionnaire) to verify
   * an engagement exists and optionally that it belongs to the requesting user.
   */
  async assertEngagementAccess(
    engagementId: string,
    userId?: string
  ): Promise<IEngagement> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (userId && engagement.userId.toString() !== userId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    return engagement;
  },
};
