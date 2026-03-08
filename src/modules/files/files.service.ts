/**
 * FILE: modules/files/files.service.ts
 *
 * PURPOSE
 * Business logic for file metadata management.
 */

import {
  createFileRecord,
  getFilesByContact,
} from "./files.model.js";

/**
 * Admin shares file link
 */
export const shareFile = async (
  fileName: string,
  fileType: string,
  fileLink: string,
  contactId: string
) => {
  return createFileRecord(
    fileName,
    fileType,
    fileLink,
    "ADMIN",
    contactId
  );
};

/**
 * Fetch files related to a conversation
 */
export const fetchFiles = async (contactId: string) => {
  return getFilesByContact(contactId);
};