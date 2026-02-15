/**
 * Feedback Routes
 * 
 * Defines all feedback-related endpoints.
 */

import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { clientAuthMiddleware } from '../middleware/clientAuth.middleware';
import { requireFeedbackOrFullAccess, enforceReadOnly } from '../middleware/completion.middleware';

const router = Router();

/**
 * Client feedback routes
 */

// @route   POST /api/client/feedback
// @desc    Submit feedback for completed engagement
// @access  Client only
router.post(
  '/client/feedback',
  clientAuthMiddleware,
  feedbackController.submitFeedback
);

// @route   GET /api/client/feedback/status
// @desc    Get feedback status for current engagement
// @access  Client only
router.get(
  '/client/feedback/status',
  clientAuthMiddleware,
  feedbackController.getFeedbackStatus
);

// @route   GET /api/client/feedback
// @desc    Get feedback for current engagement
// @access  Client only
router.get(
  '/client/feedback',
  clientAuthMiddleware,
  requireFeedbackOrFullAccess, // Only accessible after feedback submitted
  enforceReadOnly, // Enforce read-only mode
  feedbackController.getMyFeedback
);

/**
 * Admin feedback routes
 */

// @route   GET /api/admin/feedback
// @desc    Get all feedback with pagination and filters
// @access  Admin only
router.get(
  '/admin/feedback',
  adminAuthMiddleware,
  feedbackController.getAllFeedback
);

// @route   GET /api/admin/feedback/stats
// @desc    Get feedback statistics
// @access  Admin only
router.get(
  '/admin/feedback/stats',
  adminAuthMiddleware,
  feedbackController.getFeedbackStats
);

// @route   GET /api/admin/feedback/needed
// @desc    Get engagements needing feedback
// @access  Admin only
router.get(
  '/admin/feedback/needed',
  adminAuthMiddleware,
  feedbackController.getEngagementsNeedingFeedback
);

// @route   GET /api/admin/feedback/:feedbackId
// @desc    Get feedback by ID
// @access  Admin only
router.get(
  '/admin/feedback/:feedbackId',
  adminAuthMiddleware,
  feedbackController.getFeedbackById
);

// @route   PATCH /api/admin/feedback/:feedbackId/highlight
// @desc    Toggle testimonial highlight
// @access  Admin only
router.patch(
  '/admin/feedback/:feedbackId/highlight',
  adminAuthMiddleware,
  feedbackController.toggleHighlight
);

// @route   POST /api/admin/feedback/:feedbackId/notes
// @desc    Add admin notes to feedback
// @access  Admin only
router.post(
  '/admin/feedback/:feedbackId/notes',
  adminAuthMiddleware,
  feedbackController.addAdminNotes
);

// @route   DELETE /api/admin/feedback/:feedbackId
// @desc    Delete feedback
// @access  Admin only
router.delete(
  '/admin/feedback/:feedbackId',
  adminAuthMiddleware,
  feedbackController.deleteFeedback
);

export default router;