import { Router } from 'express';
import { adminController } from './admin.controller.js';

const router = Router();

/**
 * POST /admin/login
 * Public — no auth middleware
 * Body: { email, password }
 * Returns: { token, admin }
 */
router.post('/login', adminController.login);

export default router;
