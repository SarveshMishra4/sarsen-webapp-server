import { Request, Response } from "express";
import {
  fetchMessages,
  completeMessage,
  removeMessage,
} from "./adminContact.service.js";

export const getAllMessages = async (req: Request, res: Response) => {
  const messages = await fetchMessages();

  res.json({
    success: true,
    data: messages,
  });
};

export const markMessageCompleted = async (req: Request, res: Response) => {
  const { id } = req.params;

  const message = await completeMessage(id as string);

  res.json({
    success: true,
    data: message,
  });
};

export const deleteMessage = async (req: Request, res: Response) => {
  const { id } = req.params;

  await removeMessage(id as string);

  res.json({
    success: true,
  });
};