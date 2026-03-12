import { Request, Response, NextFunction } from 'express';
import { fileReferenceService } from './fileReference.service.js';
import { attachFileSchema } from './fileReference.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const fileReferenceController = {

  /**
   * POST /engagements/:id/files/admin
   * Admin token required.
   * Attaches a file reference (URL + metadata) to an engagement.
   */
  async attachFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = attachFileSchema.safeParse(req.body);
      if (!parsed.success) {
        // FIXED: Zod uses .issues, and optional chaining satisfies TypeScript
        const errorMessage = parsed.error?.issues?.[0]?.message || 'Invalid input provided';
        throw new AppError(errorMessage, 400);
      }

      const fileRef = await fileReferenceService.attachFile(
        req.params.id as string, // FIXED: Explicitly cast to string
        req.adminId!,
        parsed.data
      );

      res.status(201).json(
        formatResponse(true, 'File attached successfully.', fileRef)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/:id/files
   * User or admin token accepted.
   * Returns all file references attached to the engagement.
   */
  async getFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin       = !!req.adminId;
      const requesterId   = isAdmin ? req.adminId! : req.userId!;
      const requesterRole = isAdmin ? 'admin' : 'user';

      const files = await fileReferenceService.getFiles(
        req.params.id as string, // FIXED: Explicitly cast to string
        requesterId,
        requesterRole as 'user' | 'admin'
      );

      res.status(200).json(
        formatResponse(true, 'Files retrieved.', {
          files,
          total: files.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },
};