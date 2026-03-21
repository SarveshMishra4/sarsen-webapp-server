// src/modules/newsletter/newsletter.controller.ts
import { Request, Response, NextFunction } from 'express';
import { newsletterService } from './newsletter.service.js';
import { subscribeSchema } from './newsletter.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const newsletterController = {

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
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

  async deleteSubscriber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await newsletterService.deleteSubscriber(id);
      res.status(200).json(
        formatResponse(true, 'Subscriber deleted successfully.', result)
      );
    } catch (err) {
      next(err);
    }
  },
};