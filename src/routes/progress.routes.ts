/**
 * Progress Routes
 * 
 * Defines all progress and milestone-related endpoints.
 */

import { Router } from 'express';
import * as progressController from '../controllers/progress.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { clientAuthMiddleware, requireEngagementAccess } from '../middleware/clientAuth.middleware';

const router = Router();

/**
 * Admin routes
 */

// @route   POST /api/admin/progress
// @desc    Update engagement progress
// @access  Admin only
router.post(
  '/admin/progress',
  adminAuthMiddleware,
  progressController.updateProgress
);

// @route   GET /api/admin/engagements/:engagementId/progress/history
// @desc    Get progress history for an engagement
// @access  Admin only
router.get(
  '/admin/engagements/:engagementId/progress/history',
  adminAuthMiddleware,
  progressController.getProgressHistory
);

// @route   GET /api/admin/engagements/:engagementId/progress/timeline
// @desc    Get milestone timeline for an engagement
// @access  Admin only
router.get(
  '/admin/engagements/:engagementId/progress/timeline',
  adminAuthMiddleware,
  progressController.getMilestoneTimeline
);

// @route   GET /api/admin/engagements/:engagementId/progress/analytics
// @desc    Get progress analytics for an engagement
// @access  Admin only
router.get(
  '/admin/engagements/:engagementId/progress/analytics',
  adminAuthMiddleware,
  progressController.getProgressAnalytics
);

// @route   GET /api/admin/progress/stalled
// @desc    Get stalled engagements (no progress in X days)
// @access  Admin only
router.get(
  '/admin/progress/stalled',
  adminAuthMiddleware,
  progressController.getStalledEngagements
);

/**
 * Client routes
 */

// @route   GET /api/client/engagements/:engagementId/progress
// @desc    Get progress view for client
// @access  Client with engagement access
router.get(
  '/client/engagements/:engagementId/progress',
  clientAuthMiddleware,
  requireEngagementAccess('engagementId'),
  progressController.getClientProgress
);

export default router;