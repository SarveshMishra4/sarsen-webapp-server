/**
 * Newsletter Model
 * Stores subscriber information
 */

import { randomUUID } from "crypto";

export interface Subscriber {
  id: string;
  email: string;
  createdAt: Date;
}

const subscribers: Subscriber[] = [];

export const addSubscriber = (email: string): Subscriber => {
  const subscriber: Subscriber = {
    id: randomUUID(),
    email,
    createdAt: new Date(),
  };

  subscribers.push(subscriber);
  return subscriber;
};

export const findSubscriberByEmail = (email: string) => {
  return subscribers.find((s) => s.email === email);
};