import { Router } from 'express';
import { servicesController } from './services.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /services — frontend retrieves all active services
router.get('/', servicesController.getAllActiveServices);

// GET /services/:id — frontend retrieves a single active service
router.get('/:id', servicesController.getServiceById);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// POST /services/admin — admin creates a service or cohort
router.post('/admin', requireAdmin, servicesController.createService);

// PUT /services/admin/:id — admin updates service details or checklist
router.put('/admin/:id', requireAdmin, servicesController.updateService);

// PATCH /services/admin/:id/status — admin enables or disables a service
router.patch('/admin/:id/status', requireAdmin, servicesController.updateStatus);

export default router;
