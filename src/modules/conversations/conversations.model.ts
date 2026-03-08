/**
 * FILE: modules/conversations/conversations.model.ts
 *
 * PURPOSE
 * Stores conversation replies between admin and users.
 */

import mongoose, { Types } from "mongoose";

/**
 * Conversation Message Interface
 */
export interface ConversationMessage {
  _id?: string;
  contactId: Types.ObjectId;
  sender: "ADMIN" | "USER";
  message: string;
  createdAt: Date;
}

/**
 * MongoDB Schema
 */
const conversationSchema = new mongoose.Schema<ConversationMessage>({
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contact",
    required: true,
  },

  sender: {
    type: String,
    enum: ["ADMIN", "USER"],
    required: true,
  },

  message: {
    type: String,
    required: true,
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * MongoDB Model
 */
export const ConversationModel = mongoose.model<ConversationMessage>(
  "Conversation",
  conversationSchema
);

/**
 * Create conversation message
 */
export const createConversationMessage = async (
  contactId: string,
  sender: "ADMIN" | "USER",
  message: string
) => {
  return ConversationModel.create({
    contactId,
    sender,
    message,
  });
};

/**
 * Fetch conversation thread
 */
export const getConversationByContact = async (contactId: string) => {
  return ConversationModel.find({ contactId }).sort({ createdAt: 1 });
};