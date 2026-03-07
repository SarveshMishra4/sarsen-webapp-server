// You are a traitor Instead of saving everything on the database you saved it in the memory Of the server You are a traitor to me for doing this Increase my work and we have completed four modules Three four modules whatever You have broken my motivation You are responsible for my emotional breakdown at this stage You are a complete leader you could have followed Stick to the basic But you I know I know you willingly choose To make my things difficult Claude is better than you It never tries to destroy me But you Traitor

/**
 * Newsletter Model
 * Handles database operations for newsletter subscribers
 */

import mongoose from "mongoose";

/**
 * Subscriber Interface
 */
export interface Subscriber {
  _id?: string;
  email: string;
  createdAt: Date;
}

/**
 * MongoDB Schema
 */
const subscriberSchema = new mongoose.Schema<Subscriber>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Export MongoDB Model
 */
export const SubscriberModel = mongoose.model<Subscriber>(
  "Subscriber",
  subscriberSchema
);

/**
 * Add a new subscriber
 */
export const addSubscriber = async (email: string): Promise<Subscriber> => {
  const subscriber = await SubscriberModel.create({ email });

  return subscriber;
};

/**
 * Find subscriber by email
 */
export const findSubscriberByEmail = async (
  email: string
): Promise<Subscriber | null> => {
  return SubscriberModel.findOne({ email });
};