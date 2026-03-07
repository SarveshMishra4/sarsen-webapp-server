/**
 * FILE: modules/adminAnalytics/adminAnalytics.service.ts
 *
 * PURPOSE
 * Business logic for admin analytics.
 *
 * RESPONSIBILITY
 * Fetch aggregated statistics from database models.
 */

import { ContactModel } from "../contact/contact.model.js";
import { SubscriberModel } from "../newsletter/newsletter.model.js";

/**
 * Dashboard Summary Service
 */
export const fetchDashboardSummary = async () => {
  /**
   * Count subscribers
   */
  const totalSubscribers = await SubscriberModel.countDocuments();

  /**
   * Count total contact messages
   */
  const totalMessages = await ContactModel.countDocuments();

  /**
   * Count open messages
   */
  const openMessages = await ContactModel.countDocuments({
    status: "OPEN",
  });

  /**
   * Count resolved messages
   */
  const resolvedMessages = await ContactModel.countDocuments({
    status: "RESOLVED",
  });

  /**
   * Latest 5 contact messages
   */
  const latestMessages = await ContactModel.find()
    .sort({ createdAt: -1 })
    .limit(5);

  /**
   * Latest 5 subscribers
   */
  const latestSubscribers = await SubscriberModel.find()
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    subscribers: {
      total: totalSubscribers,
      latest: latestSubscribers,
    },

    messages: {
      total: totalMessages,
      open: openMessages,
      resolved: resolvedMessages,
      latest: latestMessages,
    },
  };
};