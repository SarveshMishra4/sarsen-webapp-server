import { Router } from 'express';
import { contactController } from './contact.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// POST /contact — public, visitor submits form
router.post('/', contactController.submit);

// GET /contact/admin — admin views all submissions
router.get('/admin', requireAdmin, contactController.getAllSubmissions);

// GET /contact/admin/:id — admin views single submission with notes
router.get('/admin/:id', requireAdmin, contactController.getSubmissionById);

// PATCH /contact/admin/:id/status — admin updates submission status
router.patch('/admin/:id/status', requireAdmin, contactController.updateStatus);

// POST /contact/admin/:id/notes — admin adds internal note
router.post('/admin/:id/notes', requireAdmin, contactController.addNote);

export default router;
