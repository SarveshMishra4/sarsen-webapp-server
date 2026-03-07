/**
 * Newsletter Service
 * Contains business logic
 */

import { addSubscriber, findSubscriberByEmail } from "./newsletter.model.js";

export const subscribe = (email: string) => {
  const existing = findSubscriberByEmail(email);

  if (existing) {
    throw new Error("Email already subscribed");
  }

  return addSubscriber(email);
};