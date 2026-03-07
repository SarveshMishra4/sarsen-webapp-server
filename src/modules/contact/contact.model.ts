/**
 * Contact Model
 * Handles storage of contact messages in MongoDB
 */

import mongoose from "mongoose";

/**
 * Contact Message Interface
 */
export interface ContactMessage {
  _id?: string;
  name: string;
  email: string;
  message: string;
  createdAt: Date;
}

/**
 * MongoDB Schema
 */
const contactSchema = new mongoose.Schema<ContactMessage>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
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
 * Collection name will automatically become: contacts
 */
export const ContactModel = mongoose.model<ContactMessage>(
  "Contact",
  contactSchema
);

/**
 * Create a contact message
 */
export const createContact = async (
  name: string,
  email: string,
  message: string
): Promise<ContactMessage> => {
  const contact = await ContactModel.create({
    name,
    email,
    message,
  });

  return contact;
};