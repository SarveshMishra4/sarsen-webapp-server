/**
 * Subscriber Management Service
 *
 * Contains business logic for managing newsletter subscribers.
 */

import { Subscriber } from "../newsletter/newsletter.model.js";
import mongoose from "mongoose";

/**
 * Import the MongoDB model
 */
import { SubscriberModel } from "../newsletter/newsletter.model.js";

/**
 * Get all subscribers
 */
export const getAllSubscribers = async (): Promise<Subscriber[]> => {
  const subscribers = await SubscriberModel.find().sort({ createdAt: -1 });

  return subscribers;
};

/**
 * Delete subscriber by id
 */
export const deleteSubscriber = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid subscriber id");
  }

  const removed = await SubscriberModel.findByIdAndDelete(id);

  if (!removed) {
    throw new Error("Subscriber not found");
  }

  return removed;
};

/**
 * Export subscribers as simple email list
 */
export const exportSubscribers = async (): Promise<string[]> => {
  const list = await SubscriberModel.find().select("email");

  return list.map((s) => s.email);
};