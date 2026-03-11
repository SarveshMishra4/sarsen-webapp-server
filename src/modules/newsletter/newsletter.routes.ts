import { Router } from 'express';
import { newsletterController } from './newsletter.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// POST /newsletter/subscribe — public
router.post('/subscribe', newsletterController.subscribe);

// GET /newsletter/admin/subscribers — admin only
router.get('/admin/subscribers', requireAdmin, newsletterController.getAllSubscribers);

export default router;
