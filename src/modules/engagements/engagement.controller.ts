import { Request, Response, NextFunction } from 'express';
import { engagementService } from './engagement.service.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { IPurchaseQuestionnaire } from './purchaseQuestionnaire.model.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * mapPurchaseAnswers
 *
 * The PurchaseQuestionnaire model stores answers with:
 *   questionKey   — identifier
 *   questionLabel — human-readable question text
 *
 * The frontend PurchaseAnswer interface expects:
 *   questionId   — identifier
 *   questionText — human-readable question text
 *
 * This function remaps before sending the response so the frontend
 * receives the shape it expects without any DB schema change.
 */
function mapPurchaseAnswers(
  pq: IPurchaseQuestionnaire | null
): { questionId: string; questionText: string; answer: string }[] {
  if (!pq) return [];
  return pq.answers.map((a) => ({
    questionId:   a.questionKey,
    questionText: a.questionLabel,
    answer:       a.answer,
  }));
}

// ─── Controller ───────────────────────────────────────────────────────────────

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
   * User token required.
   *
   * Returns purchase questionnaire answers for the requesting user's own engagement.
   *
   * Field mapping applied here:
   *   DB:       questionKey / questionLabel
   *   Frontend: questionId  / questionText
   */
  async getPurchaseAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pq = await engagementService.getPurchaseAnswersForUser(
        req.params.id as string,
        req.userId!
      );

      res.status(200).json(
        formatResponse(true, 'Purchase answers retrieved.', {
          answers: mapPurchaseAnswers(pq),
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/admin/:id/purchase-answers
   * Admin token required.
   *
   * Returns purchase questionnaire answers for any engagement.
   * No ownership check — admin sees all.
   *
   * Field mapping applied here:
   *   DB:       questionKey / questionLabel
   *   Frontend: questionId  / questionText
   */
  async getPurchaseAnswersAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pq = await engagementService.getPurchaseAnswersAdmin(req.params.id as string);

      res.status(200).json(
        formatResponse(true, 'Purchase answers retrieved.', {
          answers: mapPurchaseAnswers(pq),
        })
      );
    } catch (err) {
      next(err);
    }
  },
};