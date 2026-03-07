import {
  getAllContacts,
  resolveContact,
  deleteContact,
} from "../contact/contact.model.js";

/**
 * Fetch messages
 */
export const fetchMessages = async () => {
  return await getAllContacts();
};

/**
 * Mark message resolved
 */
export const completeMessage = async (id: string) => {
  return await resolveContact(id);
};

/**
 * Delete message
 */
export const removeMessage = async (id: string) => {
  return await deleteContact(id);
};