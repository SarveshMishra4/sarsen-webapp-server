/**
 * Resource Routes
 * 
 * Defines all resource-related endpoints.
 */

import { Router } from 'express';
import * as resourceController from '../controllers/resource.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { clientAuthMiddleware } from '../middleware/clientAuth.middleware';

const router = Router();

/**
 * Admin routes
 */

// @route   POST /api/admin/resources
// @desc    Share a new resource
// @access  Admin only
router.post(
  '/admin/resources',
  adminAuthMiddleware,
  resourceController.shareResource
);

// @route   GET /api/admin/engagements/:engagementId/resources
// @desc    Get resources for an engagement
// @access  Admin only
router.get(
  '/admin/engagements/:engagementId/resources',
  adminAuthMiddleware,
  resourceController.getEngagementResources
);

// @route   GET /api/admin/engagements/:engagementId/resources/stats
// @desc    Get resource statistics
// @access  Admin only
router.get(
  '/admin/engagements/:engagementId/resources/stats',
  adminAuthMiddleware,
  resourceController.getResourceStats
);

// @route   PATCH /api/admin/resources/:resourceId
// @desc    Update a resource
// @access  Admin only
router.patch(
  '/admin/resources/:resourceId',
  adminAuthMiddleware,
  resourceController.updateResource
);

// @route   DELETE /api/admin/resources/:resourceId
// @desc    Delete (deactivate) a resource
// @access  Admin only
router.delete(
  '/admin/resources/:resourceId',
  adminAuthMiddleware,
  resourceController.deleteResource
);

/**
 * Client routes
 */

// @route   GET /api/client/resources
// @desc    Get resources for client's engagement
// @access  Client only
router.get(
  '/client/resources',
  clientAuthMiddleware,
  resourceController.getMyResources
);

/**
 * Shared routes (both admin and client can access with proper auth)
 */

// @route   GET /api/resources/:resourceId
// @desc    Get resource by ID
// @access  Client or Admin (with access check in controller)
router.get(
  '/resources/:resourceId',
  (req, res, next) => {
    // Allow both admin and client - controller will check access
    if (req.headers.authorization) {
      next();
    } else {
      next(new Error('Authentication required'));
    }
  },
  resourceController.getResource
);

// @route   GET /api/resources/:resourceId/download
// @desc    Download resource (tracks download count)
// @access  Client or Admin (with access check in controller)
router.get(
  '/resources/:resourceId/download',
  (req, res, next) => {
    // Allow both admin and client - controller will check access
    if (req.headers.authorization) {
      next();
    } else {
      next(new Error('Authentication required'));
    }
  },
  resourceController.downloadResource
);

export default router;