/**
 * Progress Controller
 * 
 * Handles HTTP requests for progress and milestone management:
 * - Updating engagement progress
 * - Fetching progress history
 * - Getting milestone timelines
 * - Progress analytics
 */

import { Request, Response, NextFunction } from 'express';
import * as progressService from '../services/progress.service';
import { validateProgressUpdate, validateEngagementId } from '../validators/progress.validator';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

/**
 * Update engagement progress
 * POST /api/admin/progress
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
    
    const { engagementId, progress, note } = validateProgressUpdate(req.body);
    
    const engagement = await progressService.updateProgress({
      engagementId,
      newProgress: progress,
      adminId: req.admin.id,
      note,
      isAutomatic: false,
    });
    
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
 * Get progress history for an engagement
 * GET /api/admin/engagements/:engagementId/progress/history
 * Access: Admin only
 */
export const getProgressHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { engagementId } = req.params;
    validateEngagementId(engagementId);
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const history = await progressService.getProgressHistory(engagementId, limit);
    
    res.status(200).json({
      success: true,
      data: { history },
      count: history.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get milestone timeline for an engagement
 * GET /api/admin/engagements/:engagementId/progress/timeline
 * Access: Admin only
 */
export const getMilestoneTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { engagementId } = req.params;
    validateEngagementId(engagementId);
    
    const timeline = await progressService.getMilestoneTimeline(engagementId);
    
    res.status(200).json({
      success: true,
      data: { timeline },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress analytics for an engagement
 * GET /api/admin/engagements/:engagementId/progress/analytics
 * Access: Admin only
 */
export const getProgressAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { engagementId } = req.params;
    validateEngagementId(engagementId);
    
    const analytics = await progressService.getProgressAnalytics(engagementId);
    
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client-facing progress view
 * GET /api/client/engagements/:engagementId/progress
 * Access: Client only
 */
export const getClientProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    const { engagementId } = req.params;
    
    // Verify client has access to this engagement
    if (req.client.engagementId !== engagementId) {
      throw new ApiError(403, 'You do not have access to this engagement');
    }
    
    // Get limited analytics for client view
    const analytics = await progressService.getProgressAnalytics(engagementId);
    
    // Remove sensitive admin data for client view
    const clientView = {
      currentProgress: analytics.currentProgress,
      isCompleted: analytics.isCompleted,
      startDate: analytics.startDate,
      completedAt: analytics.completedAt,
      timeline: analytics.timeline?.map((entry: any) => ({
        milestone: entry.milestone,
        reachedAt: entry.reachedAt,
        // Don't include timeSpent if too granular for clients
      })),
    };
    
    res.status(200).json({
      success: true,
      data: clientView,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check stalled engagements (admin only)
 * GET /api/admin/progress/stalled
 * Access: Admin only
 */
export const getStalledEngagements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    
    const stalled = await progressService.checkStalledEngagements(days);
    
    res.status(200).json({
      success: true,
      data: { stalled },
      count: stalled.length,
    });
  } catch (error) {
    next(error);
  }
};