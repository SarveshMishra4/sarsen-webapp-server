/**
 * Newsletter Service
 * Contains business logic for newsletter subscriptions
 */

import { addSubscriber, findSubscriberByEmail } from "./newsletter.model.js";

/**
 * Subscribe a user to the newsletter
 */
export const subscribe = async (email: string) => {
  // Check if email already exists
  const existing = await findSubscriberByEmail(email);

  if (existing) {
    throw new Error("Email already subscribed");
  }

  // Add new subscriber to database
  const subscriber = await addSubscriber(email);

  return subscriber;
};