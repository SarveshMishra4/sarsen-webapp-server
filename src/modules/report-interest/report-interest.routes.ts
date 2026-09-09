import { Router } from 'express';
import { reportInterestController } from './report-interest.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// POST /report-interest — public, visitor requests the report from the homepage modal
router.post('/', reportInterestController.submit);

// GET /report-interest/admin — admin views all submissions
router.get('/admin', requireAdmin, reportInterestController.getAllSubmissions);

// ─────────────────────────────────────────────────────────────────────────
// GET /report-interest/admin/:id and PATCH /report-interest/admin/:id/status
// can be added later, mirroring contact.routes.ts, if status management
// becomes needed.
// ─────────────────────────────────────────────────────────────────────────

export default router;
