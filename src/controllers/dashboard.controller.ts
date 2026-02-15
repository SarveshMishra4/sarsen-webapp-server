/**
 * Dashboard Controller
 * 
 * Handles HTTP requests for admin dashboard:
 * - Real-time dashboard metrics
 * - Cached dashboard data
 * - Dashboard summary for sidebar
 * - Manual cache refresh
 * - Notifications
 */

import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import * as notificationService from '../services/notification.service';
import { validateDashboardFilters } from '../validators/dashboard.validator';
import { ApiError } from '../middleware/error.middleware';

/**
 * Get full dashboard with real-time metrics
 * GET /api/admin/dashboard/full
 * Access: Admin only
 */
export const getFullDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const filters = validateDashboardFilters(req.query);
    
    const dashboard = await dashboardService.generateDashboardMetrics(filters);
    
    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cached dashboard (faster)
 * GET /api/admin/dashboard/cached
 * Access: Admin only
 */
export const getCachedDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const cached = await dashboardService.getCachedDashboard();
    
    if (!cached) {
      // If no cache, generate fresh data
      const fresh = await dashboardService.generateDashboardMetrics();
      
      // FIXED: Move realtime: true after spread to ensure it overrides
      res.status(200).json({
        success: true,
        data: {
          ...fresh,
          realtime: true,
        },
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: {
        realtime: false,
        snapshotDate: cached.snapshotDate,
        metrics: {
          engagements: {
            total: cached.totalEngagements,
            active: cached.activeEngagements,
            completed: cached.completedEngagements,
            stalled: cached.stalledEngagements,
            needingFeedback: cached.engagementsNeedingFeedback,
          },
          revenue: {
            total: cached.totalRevenue,
            monthly: cached.monthlyRevenue,
            quarterly: cached.quarterlyRevenue,
            yearly: cached.yearlyRevenue,
            averageOrderValue: cached.averageOrderValue,
          },
          users: {
            total: cached.totalClients,
            newThisMonth: cached.newClientsThisMonth,
            returning: cached.returningClients,
          },
          communication: {
            totalMessages: cached.totalMessages,
            unreadMessages: cached.unreadMessages,
            averagePerEngagement: cached.averageMessagesPerEngagement,
          },
          resources: {
            total: cached.totalResources,
            totalDownloads: cached.totalDownloads,
            totalViews: cached.totalViews,
            byType: {}, // Not stored in cache for simplicity
          },
          questionnaires: {
            total: cached.totalQuestionnaires,
            pending: cached.pendingQuestionnaires,
            overdue: cached.overdueQuestionnaires,
            completionRate: cached.averageCompletionRate,
          },
          feedback: {
            total: cached.totalFeedback,
            averageRating: cached.averageRating,
            positive: cached.positiveFeedbackCount,
            neutral: cached.neutralFeedbackCount,
            negative: cached.negativeFeedbackCount,
            recommendationRate: cached.recommendationRate,
          },
        },
        trends: {
          engagements: cached.engagementsTrend || [],
          revenue: cached.revenueTrend || [],
        },
        topPerformers: {
          services: cached.topPerformingServices || [],
          rated: cached.topRatedServices || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard summary (lightweight)
 * GET /api/admin/dashboard/summary
 * Access: Admin only
 */
export const getDashboardSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const summary = await dashboardService.getDashboardSummary();
    
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh dashboard cache manually
 * POST /api/admin/dashboard/refresh
 * Access: Admin only
 */
export const refreshDashboardCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    await dashboardService.refreshDashboardCache();
    
    res.status(200).json({
      success: true,
      message: 'Dashboard cache refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all notifications
 * GET /api/admin/notifications
 * Access: Admin only
 */
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const notifications = notificationService.getNotifications(unreadOnly, limit);
    const unreadCount = notificationService.getUnreadCount();
    
    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * PATCH /api/admin/notifications/:notificationId/read
 * Access: Admin only
 */
export const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { notificationId } = req.params;
    
    if (!notificationId) {
      throw new ApiError(400, 'Notification ID is required');
    }
    
    notificationService.markAsRead(notificationId);
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * POST /api/admin/notifications/read-all
 * Access: Admin only
 */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    notificationService.markAllAsRead();
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread notification count
 * GET /api/admin/notifications/unread-count
 * Access: Admin only
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const count = notificationService.getUnreadCount();
    
    res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};