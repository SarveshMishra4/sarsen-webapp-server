/**
 * Dashboard Routes
 * 
 * Defines all admin dashboard and notification endpoints.
 * All routes are admin-only.
 */

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// All dashboard routes require admin authentication
router.use(adminAuthMiddleware);

/**
 * Dashboard data routes
 */

// @route   GET /api/admin/dashboard/summary
// @desc    Get lightweight dashboard summary for sidebar/widgets
// @access  Admin only
router.get('/dashboard/summary', dashboardController.getDashboardSummary);

// @route   GET /api/admin/dashboard/cached
// @desc    Get cached dashboard data (faster)
// @access  Admin only
router.get('/dashboard/cached', dashboardController.getCachedDashboard);

// @route   GET /api/admin/dashboard/full
// @desc    Get full real-time dashboard metrics
// @access  Admin only
router.get('/dashboard/full', dashboardController.getFullDashboard);

// @route   POST /api/admin/dashboard/refresh
// @desc    Manually refresh dashboard cache
// @access  Admin only
router.post('/dashboard/refresh', dashboardController.refreshDashboardCache);

/**
 * Notification routes
 */

// @route   GET /api/admin/notifications
// @desc    Get all notifications
// @access  Admin only
router.get('/notifications', dashboardController.getNotifications);

// @route   GET /api/admin/notifications/unread-count
// @desc    Get unread notification count
// @access  Admin only
router.get('/notifications/unread-count', dashboardController.getUnreadCount);

// @route   PATCH /api/admin/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Admin only
router.patch('/notifications/:notificationId/read', dashboardController.markNotificationAsRead);

// @route   POST /api/admin/notifications/read-all
// @desc    Mark all notifications as read
// @access  Admin only
router.post('/notifications/read-all', dashboardController.markAllAsRead);

export default router;