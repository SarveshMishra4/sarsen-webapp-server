import { Router } from 'express';
import { leadMagnetController } from './leadmagnet.controller.js';

const router = Router();

// POST /leadmagnets/business-heat-map — public, no auth.
// Founders never get accounts or logins — this mirrors the /contact
// pattern of a fully public POST endpoint.
router.post('/business-heat-map', leadMagnetController.submitBusinessHeatMap);

// Admin retrieval routes (GET /leadmagnets/admin, etc.) are intentionally
// NOT included here — that's Phase 8 (Admin Retrieval) in the implementation
// plan and comes after this founder-to-database pipe is proven end-to-end.

export default router;
