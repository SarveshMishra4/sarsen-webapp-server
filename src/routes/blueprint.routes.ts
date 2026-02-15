/**
 * Service Blueprint Routes
 * 
 * Defines all service blueprint management endpoints.
 * All routes are protected by admin authentication.
 */

import { Router } from 'express';
import * as blueprintController from '../controllers/blueprint.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// All blueprint routes require admin authentication
router.use(adminAuthMiddleware);

/**
 * @route   POST /api/admin/blueprints
 * @desc    Create a new service blueprint
 * @access  Admin only
 */
router.post('/', blueprintController.createBlueprint);

/**
 * @route   GET /api/admin/blueprints
 * @desc    Get all blueprints (with optional filters)
 * @access  Admin only
 */
router.get('/', blueprintController.getAllBlueprints);

/**
 * @route   GET /api/admin/blueprints/code/:serviceCode
 * @desc    Get blueprint by service code
 * @access  Admin only
 */
router.get('/code/:serviceCode', blueprintController.getBlueprintByCode);

/**
 * @route   GET /api/admin/blueprints/slug/:slug
 * @desc    Get blueprint by service slug
 * @access  Admin only
 */
router.get('/slug/:slug', blueprintController.getBlueprintBySlug);

/**
 * @route   PUT /api/admin/blueprints/:serviceCode
 * @desc    Update a blueprint
 * @access  Admin only
 */
router.put('/:serviceCode', blueprintController.updateBlueprint);

/**
 * @route   DELETE /api/admin/blueprints/:serviceCode
 * @desc    Deactivate a blueprint (soft delete)
 * @access  Admin only
 */
router.delete('/:serviceCode', blueprintController.deleteBlueprint);

export default router;