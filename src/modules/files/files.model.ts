/**
 * FILE: modules/files/files.model.ts
 *
 * PURPOSE
 * Stores file metadata and links.
 * Actual files are stored externally (Google Drive).
 */

import mongoose from "mongoose";

/**
 * File Interface
 */
export interface FileRecord {
  _id?: string;
  contactId?: string;
  fileName: string;
  fileType: string;
  fileLink: string;
  uploadedBy: "ADMIN" | "USER";
  createdAt: Date;
}

/**
 * MongoDB Schema
 */
const fileSchema = new mongoose.Schema<FileRecord>({
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contact",
    required: false,
  },

  fileName: {
    type: String,
    required: true,
  },

  fileType: {
    type: String,
    required: true,
  },

  fileLink: {
    type: String,
    required: true,
  },

  uploadedBy: {
    type: String,
    enum: ["ADMIN", "USER"],
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * MongoDB Model
 */
export const FileModel = mongoose.model<FileRecord>(
  "File",
  fileSchema
);

/**
 * Create file record
 */
export const createFileRecord = async (
  fileName: string,
  fileType: string,
  fileLink: string,
  uploadedBy: "ADMIN" | "USER",
  contactId?: string
) => {
  return FileModel.create({
    fileName,
    fileType,
    fileLink,
    uploadedBy,
    contactId,
  });
};

/**
 * Fetch files by contact
 */
export const getFilesByContact = async (contactId: string) => {
  return FileModel.find({ contactId }).sort({ createdAt: -1 });
};