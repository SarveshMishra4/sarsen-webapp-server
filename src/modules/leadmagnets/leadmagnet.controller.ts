import { Request, Response, NextFunction } from 'express';
import { leadMagnetService } from './leadmagnet.service.js';
import { submitBusinessHeatMapSchema } from './leadmagnet.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const leadMagnetController = {

  async submitBusinessHeatMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitBusinessHeatMapSchema.safeParse(req.body);

      if (!parsed.success) {
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid submission';
        throw new AppError(errorMessage, 400);
      }

      const { email, founderName, companyName, industry, answers } = parsed.data;
      const { submissionId, clientStatus, result } =
        await leadMagnetService.submitBusinessHeatMap(email, founderName, companyName, industry, answers);

      res.status(201).json(
        formatResponse(true, 'Submission received.', {
          submissionId,
          clientStatus,
          result,
        })
      );
    } catch (err) {
      next(err);
    }
  },
};