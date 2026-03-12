import { Request, Response, NextFunction } from 'express';
import { checklistService } from './checklist.service.js';
import { toggleStepSchema, updateChecklistSchema } from './checklist.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const checklistController = {

  /**
   * PATCH /engagements/admin/:id/checklist/:stepId
   * Admin toggles a single checklist step complete or incomplete.
   * Body: { isCompleted: true/false }
   */
  async toggleStep(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = toggleStepSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Add optional chaining '?.' to handle strict array index checks
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const engagement = await checklistService.toggleStep(
        // FIX: Explicitly cast to string
        req.params.id as string,
        req.params.stepId as string,
        parsed.data.isCompleted
      );

      res.status(200).json(
        formatResponse(true, 'Step updated.', {
          engagementChecklist: engagement.engagementChecklist,
          progressPercent:     engagement.progressPercent,
          canDeliver:          engagement.canDeliver,
          status:              engagement.status,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /engagements/admin/:id/checklist
   * Admin replaces the entire checklist structure.
   * Body: { steps: [{ stepId, title, order }] }
   */
  async updateChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateChecklistSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIX: Add optional chaining '?.' and a fallback
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }

      const engagement = await checklistService.updateChecklist(
        // FIX: Explicitly cast to string
        req.params.id as string,
        parsed.data.steps
      );

      res.status(200).json(
        formatResponse(true, 'Checklist updated.', {
          engagementChecklist: engagement.engagementChecklist,
          progressPercent:     engagement.progressPercent,
          canDeliver:          engagement.canDeliver,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/:id/checklist
   * User token — returns own engagement checklist (read only).
   * Admin can also call this.
   */
  async getChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin       = !!req.adminId;
      const requesterId   = isAdmin ? req.adminId! : req.userId!;
      const requesterRole = isAdmin ? 'admin' : 'user';

      const result = await checklistService.getChecklist(
        // FIX: Explicitly cast to string
        req.params.id as string,
        requesterId,
        requesterRole as 'user' | 'admin'
      );

      res.status(200).json(
        formatResponse(true, 'Checklist retrieved.', result)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /engagements/admin/:id/deliver
   * Admin delivers the engagement. Only works when progressPercent === 100.
   */
  async deliverEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const engagement = await checklistService.deliverEngagement(
        // FIX: Explicitly cast to string
        req.params.id as string
      );

      res.status(200).json(
        formatResponse(true, 'Engagement delivered successfully.', {
          status:          engagement.status,
          progressPercent: engagement.progressPercent,
          canDeliver:      engagement.canDeliver,
        })
      );
    } catch (err) {
      next(err);
    }
  },
};