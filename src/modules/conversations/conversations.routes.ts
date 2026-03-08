/**
 * FILE: modules/conversations/conversations.routes.ts
 *
 * PURPOSE
 * API routes for conversation system.
 */

import { Router } from "express";
import {
  adminReply,
  getConversation,
} from "./conversations.controller.js";

const router = Router();

/**
 * Admin replies to contact message
 */
router.post("/reply", adminReply);

/**
 * Fetch conversation thread
 */
router.get("/:contactId", getConversation);

export default router;