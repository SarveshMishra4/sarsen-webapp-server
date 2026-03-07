/**
 * Subscriber Management Controller
 *
 * Acts as the middle layer between routes and services.
 */

import { Request, Response } from "express";
import {
  getAllSubscribers,
  deleteSubscriber,
  exportSubscribers,
} from "./subscribers.service.js";

/**
 * Get list of subscribers
 */
export const getSubscribers = async (req: Request, res: Response) => {
  try {
    const subscribers = await getAllSubscribers();

    res.json({
      total: subscribers.length,
      subscribers,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
};

/**
 * Delete subscriber by ID
 */
export const deleteSubscriberController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const deleted = await deleteSubscriber(id as string);

    res.json({
      message: "Subscriber deleted successfully",
      deleted,
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message,
    });
  }
};

/**
 * Export subscriber emails
 */
export const exportSubscribersController = async (
  req: Request,
  res: Response
) => {
  try {
    const emails = await exportSubscribers();

    res.json({
      total: emails.length,
      emails,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
};