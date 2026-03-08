/**
 * FILE: modules/conversations/conversations.controller.ts
 *
 * PURPOSE
 * Handles HTTP requests for conversation system.
 */

import { Request, Response } from "express";
import {
  replyToContact,
  fetchConversation,
} from "./conversations.service.js";

/**
 * Admin sends reply
 */
export const adminReply = async (req: Request, res: Response) => {
  try {
    const { contactId, message } = req.body;

    const reply = await replyToContact(contactId, message);

    res.status(201).json({
      success: true,
      data: reply,
    });
  } catch (error) {
    console.error("Reply Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
};

/**
 * Fetch conversation thread
 */
export const getConversation = async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const messages = await fetchConversation(contactId as string);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("Conversation Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch conversation",
    });
  }
};