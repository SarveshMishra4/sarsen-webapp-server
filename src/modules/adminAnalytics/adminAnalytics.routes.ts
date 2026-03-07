/**
 * FILE: modules/adminAnalytics/adminAnalytics.routes.ts
 *
 * PURPOSE
 * Defines API routes for admin dashboard analytics.
 *
 * ROUTES
 * GET /api/admin/analytics/summary
 * Returns high level dashboard metrics.
 */

import { Router } from "express";
import { getDashboardSummary } from "./adminAnalytics.controller.js";

const router = Router();

/**
 * Dashboard Summary Route
 * Returns aggregated analytics data
 */
router.get("/summary", getDashboardSummary);

export default router;