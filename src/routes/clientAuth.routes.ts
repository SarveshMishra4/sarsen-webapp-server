/**
 * Client Authentication Routes
 * 
 * Defines all client authentication endpoints.
 * These are engagement-scoped - tokens grant access to specific engagements.
 */

import { Router } from 'express';
import * as clientAuthController from '../controllers/clientAuth.controller';
import { clientAuthMiddleware } from '../middleware/clientAuth.middleware';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// @route   POST /api/client/auth/login
// @desc    Login client (optionally to specific engagement)
// @access  Public
router.post('/login', clientAuthController.loginClient);

// @route   POST /api/client/auth/refresh
// @desc    Refresh client access token
// @access  Public (requires valid refresh token in body)
router.post('/refresh', clientAuthController.refreshClientToken);

/**
 * Protected routes (require valid JWT)
 */

// @route   POST /api/client/auth/logout
// @desc    Logout client
// @access  Private (Client only)
router.post('/logout', clientAuthMiddleware, clientAuthController.logoutClient);

// @route   GET /api/client/auth/me
// @desc    Get current client profile
// @access  Private (Client only)
router.get('/me', clientAuthMiddleware, clientAuthController.getCurrentClient);

// @route   GET /api/client/auth/engagements
// @desc    Get all engagements for current client
// @access  Private (Client only)
router.get('/engagements', clientAuthMiddleware, clientAuthController.getClientEngagements);

export default router;