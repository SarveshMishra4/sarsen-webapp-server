/**
 * FILE: modules/files/files.controller.ts
 *
 * PURPOSE
 * Handles HTTP requests for file sharing.
 */

import { Request, Response } from "express";
import { shareFile, fetchFiles } from "./files.service.js";

/**
 * Admin shares a file link
 */
export const uploadFileLink = async (
  req: Request,
  res: Response
) => {
  try {
    const { fileName, fileType, fileLink, contactId } = req.body;

    const file = await shareFile(
      fileName,
      fileType,
      fileLink,
      contactId
    );

    res.status(201).json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error("File Upload Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save file link",
    });
  }
};

/**
 * Fetch files for a contact
 */
export const getFiles = async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const files = await fetchFiles(contactId as string);

    res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error("Fetch Files Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch files",
    });
  }
};