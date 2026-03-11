import { Request, Response, NextFunction } from 'express';
import { newsletterService } from './newsletter.service';
import { subscribeSchema } from './newsletter.validator';
import { formatResponse } from '../../core/utils/formatResponse';
import { AppError } from '../../core/errors/AppError';

export const newsletterController = {

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await newsletterService.subscribe(parsed.data.email);

      res.status(201).json(
        formatResponse(true, 'Subscribed successfully.', result)
      );
    } catch (err) {
      next(err);
    }
  },

  async getAllSubscribers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscribers = await newsletterService.getAllSubscribers();

      res.status(200).json(
        formatResponse(true, 'Subscribers retrieved.', { subscribers, total: subscribers.length })
      );
    } catch (err) {
      next(err);
    }
  },
};
