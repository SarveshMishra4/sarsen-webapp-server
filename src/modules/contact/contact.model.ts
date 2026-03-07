/**
 * Contact Model
 */

import { randomUUID } from "crypto";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

const contacts: ContactMessage[] = [];

export const createContact = (
  name: string,
  email: string,
  message: string
) => {
  const contact: ContactMessage = {
    id: randomUUID(),
    name,
    email,
    message,
    createdAt: new Date(),
  };

  contacts.push(contact);

  return contact;
};