/**
 * Subscriber Management Routes
 *
 * Provides admin APIs for managing newsletter subscribers.
 */

import { Router } from "express";
import {
  getSubscribers,
  deleteSubscriberController,
  exportSubscribersController,
} from "./subscribers.controller.js";

import { requireAuth, requireAdmin } from "../identity/identity.middleware.js";

const router = Router();

/**
 * View all subscribers
 */
router.get(
  "/admin/subscribers",
  requireAuth,
  requireAdmin,
  getSubscribers
);

/**
 * Delete a subscriber
 */
router.delete(
  "/admin/subscribers/:id",
  requireAuth,
  requireAdmin,
  deleteSubscriberController
);

/**
 * Export subscriber emails
 */
router.get(
  "/admin/subscribers/export",
  requireAuth,
  requireAdmin,
  exportSubscribersController
);

export default router;