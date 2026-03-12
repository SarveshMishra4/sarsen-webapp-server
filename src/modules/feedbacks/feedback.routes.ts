import { Router } from 'express';
import { feedbackController } from './feedback.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── User Routes ──────────────────────────────────────────────────────────────

// POST /feedback/engagements/:id — user submits feedback on a delivered engagement
router.post('/engagements/:id', requireUser, feedbackController.submitFeedback);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /feedback/admin — admin retrieves all feedback across all engagements
router.get('/admin', requireAdmin, feedbackController.getAllFeedback);

// GET /feedback/admin/engagements/:id — admin retrieves feedback for a specific engagement
router.get('/admin/engagements/:id', requireAdmin, feedbackController.getFeedbackForEngagement);

export default router;
