/**
 * Subscriber Management Service
 *
 * Contains business logic for managing newsletter subscribers.
 */

import { Subscriber } from "../newsletter/newsletter.model.js";

/**
 * Import the subscriber storage from the newsletter module
 * This allows us to read subscriber data without modifying newsletter logic
 */
import * as NewsletterModel from "../newsletter/newsletter.model.js";

/**
 * Get all subscribers
 */
export const getAllSubscribers = (): Subscriber[] => {
  return (NewsletterModel as any).subscribers || [];
};

/**
 * Delete subscriber by id
 */
export const deleteSubscriber = (id: string) => {
  const list = (NewsletterModel as any).subscribers;

  const index = list.findIndex((s: Subscriber) => s.id === id);

  if (index === -1) {
    throw new Error("Subscriber not found");
  }

  const removed = list.splice(index, 1);

  return removed[0];
};

/**
 * Export subscribers as simple email list
 */
export const exportSubscribers = () => {
  const list = (NewsletterModel as any).subscribers || [];

  return list.map((s: Subscriber) => s.email);
};