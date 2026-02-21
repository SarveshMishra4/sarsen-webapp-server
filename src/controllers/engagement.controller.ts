/**
 * Engagement Controller
 * 
 * Handles HTTP requests for engagement management.
 * Some endpoints are client-facing, others are admin-only.
 */

import { Request, Response, NextFunction } from 'express';
import * as engagementService from '../services/engagement.service';
import { validateEngagementId, validateProgressUpdate } from '../validators/engagement.validator';
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { Engagement } from '../models/Engagement.model';

/**
 * Get engagement by ID
 * GET /api/engagements/:engagementId
 * Access: Client or Admin (with proper auth)
 */
export const getEngagement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { engagementId } = req.params;

    // Validate engagement ID format
    validateEngagementId(engagementId);

    let engagement;

    if (req.client) {
      engagement = await Engagement.findOne({
        engagementId,
        userId: req.client.id,
      });
    } else {
      engagement = await engagementService.getEngagementById(engagementId);
    }

    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }

    // Check access rights
    if (req.client) {
      // Client access - verify they own this engagement
      if (engagement.userId.toString() !== req.client.id) {
        throw new ApiError(403, 'You do not have access to this engagement');
      }
    } else if (!req.admin) {
      // No authentication
      throw new ApiError(401, 'Authentication required');
    }
    // Admin access - allowed (already authenticated via admin middleware)

    res.status(200).json({
      success: true,
      data: { engagement },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client's engagements
 * GET /api/client/engagements
 * Access: Client only
 */
export const getMyEngagements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Authentication required');
    }

    const engagements = await engagementService.getClientEngagements(req.client.id);

    res.status(200).json({
      success: true,
      data: { engagements },
      count: engagements.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all engagements (admin)
 * GET /api/admin/engagements
 * Access: Admin only
 */
export const getAllEngagements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const filters: any = {};
    if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
    if (req.query.isCompleted !== undefined) filters.isCompleted = req.query.isCompleted === 'true';
    if (req.query.serviceCode) filters.serviceCode = req.query.serviceCode as string;

    const result = await engagementService.getAllEngagements(page, limit, filters);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update engagement progress
 * PATCH /api/admin/engagements/:engagementId/progress
 * Access: Admin only
 */
export const updateProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }

    const { engagementId } = req.params;
    const { progress, note } = validateProgressUpdate(req.body);

    const engagement = await engagementService.updateEngagementProgress(
      engagementId,
      progress,
      req.admin.id,
      note
    );

    res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: { engagement },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin dashboard stats
 * GET /api/admin/dashboard
 * Access: Admin only
 */
export const getAdminDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }

    const stats = await engagementService.getAdminDashboardStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};