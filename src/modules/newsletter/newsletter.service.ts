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

  async getAllSubscribers(): Promise<{ email: string; subscribedAt: Date }[]> {
    const subscribers = await NewsletterSubscriber.find()
      .sort({ createdAt: -1 })
      .select('email createdAt');

    return subscribers.map((s) => ({
      email: s.email,
      subscribedAt: s.createdAt,
    }));
  },
};
