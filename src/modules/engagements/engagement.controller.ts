import { Request, Response, NextFunction } from 'express';
import { engagementService } from './engagement.service.js';
import { formatResponse } from '../../core/utils/formatResponse.js';

export const engagementController = {

  // ─── User Handlers ────────────────────────────────────────────────────────

  /**
   * GET /engagements
   * User token required.
   * Returns all engagements belonging to the authenticated user.
   */
  async getUserEngagements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const engagements = await engagementService.getUserEngagements(req.userId!);

      res.status(200).json(
        formatResponse(true, 'Engagements retrieved.', {
          engagements,
          total: engagements.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/:id
   * User token required.
   * Returns a single engagement. Returns 403 if the engagement belongs to someone else.
   */
  async getUserEngagementById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const engagement = await engagementService.getUserEngagementById(
        // FIX: Cast Express params as string
        req.params.id as string,
        req.userId!
      );

      res.status(200).json(
        formatResponse(true, 'Engagement retrieved.', engagement)
      );
    } catch (err) {
      next(err);
    }
  },

  // ─── Admin Handlers ───────────────────────────────────────────────────────

  /**
   * GET /engagements/admin
   * Admin token required.
   * Returns all engagements across all users with user email and service details populated.
   */
  async getAllEngagements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const engagements = await engagementService.getAllEngagements();

      res.status(200).json(
        formatResponse(true, 'Engagements retrieved.', {
          engagements,
          total: engagements.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/admin/:id
   * Admin token required.
   * Returns a single engagement regardless of which user it belongs to.
   */
  async getEngagementByIdAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // FIX: Cast Express params as string
      const engagement = await engagementService.getEngagementByIdAdmin(req.params.id as string);

      res.status(200).json(
        formatResponse(true, 'Engagement retrieved.', engagement)
      );
    } catch (err) {
      next(err);
    }
  },

  // ─── Purchase Questionnaire Handlers ─────────────────────────────────────

  /**
   * GET /engagements/:id/purchase-answers
   * User token required. Returns the user's own purchase questionnaire answers.
   */
  async getPurchaseAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const answers = await engagementService.getPurchaseAnswersForUser(
        // FIX: Cast Express params as string
        req.params.id as string,
        req.userId!
      );

      res.status(200).json(
        formatResponse(true, 'Purchase answers retrieved.', answers ?? { answers: [] })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/admin/:id/purchase-answers
   * Admin token required. Returns purchase questionnaire answers for any engagement.
   */
  async getPurchaseAnswersAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // FIX: Cast Express params as string
      const answers = await engagementService.getPurchaseAnswersAdmin(req.params.id as string);

      res.status(200).json(
        formatResponse(true, 'Purchase answers retrieved.', answers ?? { answers: [] })
      );
    } catch (err) {
      next(err);
    }
  },
};