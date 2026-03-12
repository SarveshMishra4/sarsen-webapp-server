import { Request, Response, NextFunction } from 'express';
import { feedbackService } from './feedback.service.js';
import { submitFeedbackSchema } from './feedback.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const feedbackController = {

  /**
   * POST /engagements/:id/feedback
   * User token required.
   * Submits feedback for a delivered engagement. One submission per engagement.
   */
  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Use .issues, optional chaining, and a fallback string
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const feedback = await feedbackService.submitFeedback(
        // FIX: Explicitly cast to string
        req.params.id as string,
        req.userId!,
        // FIX: Cast parsed.data to satisfy exactOptionalPropertyTypes
        parsed.data as { rating: number; comments?: string }
      );

      res.status(201).json(
        formatResponse(true, 'Feedback submitted. Thank you.', feedback)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /feedback/admin
   * Admin token required.
   * Returns all feedback across all engagements, sorted newest first.
   */
  async getAllFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedbackList = await feedbackService.getAllFeedback();

      res.status(200).json(
        formatResponse(true, 'Feedback retrieved.', {
          feedback: feedbackList,
          total:    feedbackList.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/admin/:id/feedback
   * Admin token required.
   * Returns feedback for a specific engagement. Returns null data if none submitted yet.
   */
  async getFeedbackForEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // FIX: Explicitly cast to string
      const feedback = await feedbackService.getFeedbackForEngagement(req.params.id as string);

      res.status(200).json(
        formatResponse(
          true,
          feedback ? 'Feedback retrieved.' : 'No feedback submitted yet.',
          feedback ?? null
        )
      );
    } catch (err) {
      next(err);
    }
  },
};