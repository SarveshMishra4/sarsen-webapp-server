/**
 * Engagement Routes
 * 
 * Defines all engagement-related endpoints.
 * Some routes are client-facing, others are admin-only.
 */

import { Router } from 'express';
import * as engagementController from '../controllers/engagement.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { clientAuthMiddleware, requireEngagementAccess } from '../middleware/clientAuth.middleware';

const router = Router();

/**
 * Client-facing engagement routes
 */

// @route   GET /api/client/engagements
// @desc    Get all engagements for authenticated client
// @access  Private (Client only)
router.get('/client/engagements', clientAuthMiddleware, engagementController.getMyEngagements);

// @route   GET /api/client/engagements/:engagementId
// @desc    Get specific engagement (client must own it)
// @access  Private (Client only)
router.get(
  '/client/engagements/:engagementId',
  clientAuthMiddleware,
  requireEngagementAccess('engagementId'),
  engagementController.getEngagement
);

/**
 * Admin-facing engagement routes
 */

// @route   GET /api/admin/engagements
// @desc    Get all engagements with pagination and filters
// @access  Private (Admin only)
router.get('/admin/engagements', adminAuthMiddleware, engagementController.getAllEngagements);

// @route   GET /api/admin/engagements/:engagementId
// @desc    Get specific engagement (admin access)
// @access  Private (Admin only)
router.get('/admin/engagements/:engagementId', adminAuthMiddleware, engagementController.getEngagement);

// @route   PATCH /api/admin/engagements/:engagementId/progress
// @desc    Update engagement progress
// @access  Private (Admin only)
router.patch(
  '/admin/engagements/:engagementId/progress',
  adminAuthMiddleware,
  engagementController.updateProgress
);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Private (Admin only)
router.get('/admin/dashboard', adminAuthMiddleware, engagementController.getAdminDashboard);

export default router;