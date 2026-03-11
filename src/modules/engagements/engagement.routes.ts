import { Router } from 'express';
import { engagementController } from './engagement.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── User Routes ──────────────────────────────────────────────────────────────

// GET /engagements — user sees their own engagements only
router.get('/', requireUser, engagementController.getUserEngagements);

// GET /engagements/:id — user sees one of their engagements (403 if not theirs)
router.get('/:id', requireUser, engagementController.getUserEngagementById);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /engagements/admin — admin sees all engagements across all users
router.get('/admin', requireAdmin, engagementController.getAllEngagements);

// GET /engagements/admin/:id — admin sees any single engagement in full detail
router.get('/admin/:id', requireAdmin, engagementController.getEngagementByIdAdmin);

export default router;
