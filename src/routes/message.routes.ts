/**
 * Message Routes
 * 
 * Defines all messaging endpoints.
 * Routes are engagement-scoped and protected by appropriate auth middleware.
 */

import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { clientAuthMiddleware, requireEngagementAccess } from '../middleware/clientAuth.middleware';

const router = Router();

/**
 * Client-facing message routes
 * All require client authentication and engagement access
 */

// @route   POST /api/messages
// @desc    Send a message in an engagement
// @access  Private (Client or Admin)
router.post(
  '/messages',
  (req, res, next) => {
    // Allow both admin and client
    if (req.headers.authorization) {
      // Will be handled by respective middleware in controller logic
      next();
    } else {
      next(new Error('Authentication required'));
    }
  },
  messageController.sendMessage
);

// @route   GET /api/messages/:engagementId
// @desc    Get messages for an engagement
// @access  Private (Client with engagement access)
router.get(
  '/messages/:engagementId',
  clientAuthMiddleware,
  requireEngagementAccess('engagementId'),
  messageController.getMessages
);

// @route   PATCH /api/messages/:engagementId/read
// @desc    Mark messages as read
// @access  Private (Client with engagement access)
router.patch(
  '/messages/:engagementId/read',
  clientAuthMiddleware,
  requireEngagementAccess('engagementId'),
  messageController.markAsRead
);

// @route   GET /api/messages/:engagementId/unread
// @desc    Get unread message count
// @access  Private (Client with engagement access)
router.get(
  '/messages/:engagementId/unread',
  clientAuthMiddleware,
  requireEngagementAccess('engagementId'),
  messageController.getUnreadCount
);

/**
 * Admin message routes
 */

// @route   GET /api/admin/messages/recent
// @desc    Get recent messages across all engagements
// @access  Private (Admin only)
router.get(
  '/admin/messages/recent',
  adminAuthMiddleware,
  messageController.getRecentMessages
);

// @route   DELETE /api/admin/messages/:messageId
// @desc    Delete a message
// @access  Private (Admin only)
router.delete(
  '/admin/messages/:messageId',
  adminAuthMiddleware,
  messageController.deleteMessage
);

// @route   GET /api/admin/engagements/:engagementId/messages
// @desc    Get messages for any engagement (admin view)
// @access  Private (Admin only)
router.get(
  '/admin/engagements/:engagementId/messages',
  adminAuthMiddleware,
  messageController.getMessages
);

export default router;