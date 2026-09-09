import { Router } from 'express';
import { reportInterestController } from './report-interest.controller.js';

const router = Router();

// POST /report-interest — public, visitor requests the report from the homepage modal
router.post('/', reportInterestController.submit);

// ─────────────────────────────────────────────────────────────────────────
// Phase 2 will add (mirroring contact.routes.ts, with requireAdmin):
//   GET  /report-interest/admin           — list all submissions
//   GET  /report-interest/admin/:id       — single submission detail
//   PATCH /report-interest/admin/:id/status — update status
// ─────────────────────────────────────────────────────────────────────────

export default router;
