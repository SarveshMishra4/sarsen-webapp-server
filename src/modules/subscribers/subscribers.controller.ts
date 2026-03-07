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
export const getSubscribers = (req: Request, res: Response) => {
  try {
    const subscribers = getAllSubscribers();

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
export const deleteSubscriberController = (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = deleteSubscriber(id as string);

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
export const exportSubscribersController = (req: Request, res: Response) => {
  try {
    const emails = exportSubscribers();

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