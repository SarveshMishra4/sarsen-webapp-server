/**
 * FILE: modules/adminAnalytics/adminAnalytics.controller.ts
 *
 * PURPOSE
 * Handles HTTP request/response for admin analytics.
 *
 * FLOW
 * Route → Controller → Service → Models
 */

import { Request, Response } from "express";
import { fetchDashboardSummary } from "./adminAnalytics.service.js";

/**
 * Controller
 * Returns analytics summary for admin dashboard
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const summary = await fetchDashboardSummary();

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Analytics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard analytics",
    });
  }
};