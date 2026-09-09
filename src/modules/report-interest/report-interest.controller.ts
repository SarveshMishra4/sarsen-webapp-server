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

  async getAllSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissions = await reportInterestService.getAllSubmissions();

      res.status(200).json(
        formatResponse(true, 'Report interest submissions retrieved.', {
          submissions,
          total: submissions.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  // getSubmissionById / updateStatus — same pattern as contact.controller.ts —
  // can be added later if status management becomes needed.
};
