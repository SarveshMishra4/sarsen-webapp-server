/**
 * Admin Authentication Routes
 * 
 * Defines all admin authentication endpoints.
 */

import { Router } from 'express';
import * as adminAuthController from '../controllers/adminAuth.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

/**
 * Public routes (no authentication required)
 */

// @route   POST /api/admin/auth/login
// @desc    Login admin
// @access  Public
router.post('/login', adminAuthController.loginAdmin);

// @route   POST /api/admin/auth/create
// @desc    Create new admin (for initial setup)
// @access  Public (should be disabled in production)
// TODO: Phase 2 Security - Disable this route in production or add IP whitelist
router.post('/create', adminAuthController.createAdmin);

// @route   POST /api/admin/auth/refresh
// @desc    Refresh access token
// @access  Public (requires valid refresh token in body)
router.post('/refresh', adminAuthController.refreshToken);

/**
 * Protected routes (require valid JWT)
 */

// @route   POST /api/admin/auth/logout
// @desc    Logout admin
// @access  Private (Admin only)
router.post('/logout', adminAuthMiddleware, adminAuthController.logoutAdmin);

// @route   GET /api/admin/auth/me
// @desc    Get current admin profile
// @access  Private (Admin only)
router.get('/me', adminAuthMiddleware, adminAuthController.getCurrentAdmin);

export default router;