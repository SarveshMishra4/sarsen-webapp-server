// src/modules/newsletter/newsletter.service.ts
import { NewsletterSubscriber } from './newsletter.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

export const newsletterService = {

  async subscribe(email: string): Promise<{ email: string }> {
    const normalised = email.toLowerCase().trim();

    const existing = await NewsletterSubscriber.findOne({ email: normalised });
    if (existing) {
      throw new AppError(
        `${normalised} is already subscribed to the newsletter.`,
        409
      );
    }

    const subscriber = await NewsletterSubscriber.create({ email: normalised });
    logger.info('[Newsletter] New subscriber', { email: normalised });

    return { email: subscriber.email };
  },

  async getAllSubscribers(): Promise<{ _id: string; email: string; createdAt: Date }[]> {
    const subscribers = await NewsletterSubscriber.find()
      .sort({ createdAt: -1 })
      .select('email createdAt');
    // Return full objects with _id for frontend deletion
    return subscribers.map((s) => ({
      _id: s._id.toString(),
      email: s.email,
      createdAt: s.createdAt,
    }));
  },

  async deleteSubscriber(id: string): Promise<{ _id: string }> {
    const deleted = await NewsletterSubscriber.findByIdAndDelete(id);
    if (!deleted) {
      throw new AppError('Subscriber not found', 404);
    }
    logger.info('[Newsletter] Subscriber deleted', { id, email: deleted.email });
    return { _id: id };
  },
};