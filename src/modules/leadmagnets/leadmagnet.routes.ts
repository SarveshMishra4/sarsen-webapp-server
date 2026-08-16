import { Router } from 'express';
import { leadMagnetController } from './leadmagnet.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── Admin Routes (protected) ─────────────────────────────────────────────
// Phase 8 from the original implementation plan — Admin Retrieval.
// Registered before the public route below; there's no dynamic public
// param route here yet (business-heat-map is the only public POST), but
// this keeps the same ordering convention as blog.routes.ts for consistency
// and safety if a public GET/:something is ever added later.

router.get('/admin', requireAdmin, leadMagnetController.getAdminLeadsList);
router.get('/admin/:clientId/submissions', requireAdmin, leadMagnetController.getAdminLeadSubmissions);
router.patch('/admin/:clientId/view', requireAdmin, leadMagnetController.markAdminLeadViewed);

// ─── Public Routes ─────────────────────────────────────────────────────────

// POST /leadmagnets/business-heat-map — public, no auth.
// Founders never get accounts or logins — this mirrors the /contact
// pattern of a fully public POST endpoint.
router.post('/business-heat-map', leadMagnetController.submitBusinessHeatMap);

export default router;