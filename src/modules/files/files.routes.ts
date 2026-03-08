/**
 * FILE: modules/files/files.routes.ts
 *
 * PURPOSE
 * API routes for file metadata system.
 */

import { Router } from "express";
import {
  uploadFileLink,
  getFiles,
} from "./files.controller.js";

const router = Router();

/**
 * Admin shares file link
 */
router.post("/share", uploadFileLink);

/**
 * Fetch files for contact
 */
router.get("/:contactId", getFiles);

export default router;