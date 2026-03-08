/**
 * FILE: modules/conversations/conversations.service.ts
 *
 * PURPOSE
 * Business logic for conversation communication.
 */

import {
  createConversationMessage,
  getConversationByContact,
} from "./conversations.model.js";

/**
 * Admin replies to a contact message
 */
export const replyToContact = async (
  contactId: string,
  message: string
) => {
  return createConversationMessage(contactId, "ADMIN", message);
};

/**
 * Fetch conversation thread
 */
export const fetchConversation = async (contactId: string) => {
  return getConversationByContact(contactId);
};