/**
 * Contact Service
 */

import { createContact } from "./contact.model.js";

export const submitContact = (
  name: string,
  email: string,
  message: string
) => {
  return createContact(name, email, message);
};