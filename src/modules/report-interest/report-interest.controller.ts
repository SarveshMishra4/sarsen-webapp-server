import { Request, Response, NextFunction } from 'express';
import { reportInterestService } from './report-interest.service.js';
import { submitReportInterestSchema } from './report-interest.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const reportInterestController = {

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitReportInterestSchema.safeParse(req.body);

      if (!parsed.success) {
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid input provided';
        throw new AppError(errorMessage, 400);
      }

      const submission = await reportInterestService.submitReportInterest(parsed.data);

      res.status(201).json(
        formatResponse(true, 'Thanks! Your copy of the report will be emailed to you shortly.', {
          id: submission._id,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  // Phase 2: getAllSubmissions, getSubmissionById, updateStatus — same pattern
  // as contact.controller.ts — added once the admin panel tab is built.
};
