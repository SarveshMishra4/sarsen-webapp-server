import { Router } from 'express';
import { identityController } from './identity.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /auth/login — user logs in, receives JWT
router.post('/login', identityController.login);

// POST /auth/resolve — test/dev endpoint to trigger resolveOrCreateUser manually
// Simulates what the purchase flow calls after payment confirmation
router.post('/resolve', identityController.resolveOrCreate);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /auth/admin/users — admin views all user accounts
router.get('/admin/users', requireAdmin, identityController.getAllUsers);

// NOTE: POST /auth/admin/users/:id/reset-password is added in Stage 15
// It lives here in the identity module but is built after the core
// engagement lifecycle is complete

export default router;
