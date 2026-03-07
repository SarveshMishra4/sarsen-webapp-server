/**
 * Contact Service
 *
 * Contains business logic for contact messages
 */

import { createContact } from "./contact.model.js";

/**
 * Submit a contact message
 */
export const submitContact = async (
  name: string,
  email: string,
  message: string
) => {
  const contact = await createContact(name, email, message);

  return contact;
};