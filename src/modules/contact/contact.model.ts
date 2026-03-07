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
  status: "OPEN" | "RESOLVED";
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

  status: {
    type: String,
    enum: ["OPEN", "RESOLVED"],
    default: "OPEN",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * MongoDB Model
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

/**
 * Fetch all contact messages
 */
export const getAllContacts = async (): Promise<ContactMessage[]> => {
  return ContactModel.find().sort({ createdAt: -1 });
};

/**
 * Mark contact message resolved
 */
export const resolveContact = async (id: string) => {
  return ContactModel.findByIdAndUpdate(
    id,
    { status: "RESOLVED" },
    { new: true }
  );
};

/**
 * Delete contact message
 */
export const deleteContact = async (id: string) => {
  return ContactModel.findByIdAndDelete(id);
};