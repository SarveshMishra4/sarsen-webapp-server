/**
 * Dashboard Service
 * 
 * Aggregates data from all services into unified dashboard metrics.
 * Provides both real-time and cached dashboard data.
 * Handles complex aggregations for admin overview.
 */

import { DashboardStats, IDashboardStats } from '../models/DashboardStats.model';
import { Engagement } from '../models/Engagement.model';
import { Order } from '../models/Order.model';
import { User } from '../models/User.model';
import { Message } from '../models/Message.model';
import { Resource } from '../models/Resource.model';
import { Questionnaire } from '../models/Questionnaire.model';
import { Feedback } from '../models/Feedback.model';
import { ProgressHistory } from '../models/ProgressHistory.model';
import * as progressService from './progress.service';
import * as completionService from './completion.service';
import * as feedbackService from './feedback.service';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  serviceCode?: string;
}

export interface DashboardResponse {
  realtime: boolean;
  snapshotDate: Date;
  metrics: {
    engagements: EngagementMetrics;
    revenue: RevenueMetrics;
    users: UserMetrics;
    communication: CommunicationMetrics;
    resources: ResourceMetrics;
    questionnaires: QuestionnaireMetrics;
    feedback: FeedbackMetrics;
  };
  trends: {
    engagements: { date: Date; count: number }[];
    revenue: { date: Date; amount: number }[];
  };
  topPerformers: {
    services: TopService[];
    rated: TopRatedService[];
  };
}

export interface EngagementMetrics {
  total: number;
  active: number;
  completed: number;
  stalled: number;
  needingFeedback: number;
  completionRate: number;
  averageProgress: number;
}

export interface RevenueMetrics {
  total: number;
  monthly: number;
  quarterly: number;
  yearly: number;
  averageOrderValue: number;
  projectedAnnual: number;
}

export interface UserMetrics {
  total: number;
  newThisMonth: number;
  returning: number;
  retentionRate: number;
  averageEngagementsPerUser: number;
}

export interface CommunicationMetrics {
  totalMessages: number;
  unreadMessages: number;
  averagePerEngagement: number;
  messagesByType: {
    admin: number;
    client: number;
  };
}

export interface ResourceMetrics {
  total: number;
  totalDownloads: number;
  totalViews: number;
  averageEngagement: number;
  byType: Record<string, number>;
}

export interface QuestionnaireMetrics {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
  completionRate: number;
  averageTimeToComplete: number;
}

export interface FeedbackMetrics {
  total: number;
  averageRating: number;
  distribution: Record<number, number>;
  positive: number;
  neutral: number;
  negative: number;
  recommendationRate: number;
  wouldUseAgainRate: number;
}

export interface TopService {
  serviceCode: string;
  serviceName: string;
  engagementCount: number;
  revenue: number;
  averageRating?: number;
}

export interface TopRatedService {
  serviceCode: string;
  serviceName: string;
  averageRating: number;
  feedbackCount: number;
}

/**
 * Generate fresh dashboard metrics (real-time)
 * @param filters - Optional date/service filters
 * @returns Complete dashboard data
 */
export const generateDashboardMetrics = async (
  filters: DashboardFilters = {}
): Promise<DashboardResponse> => {
  const startTime = Date.now();
  
  try {
    const { startDate, endDate, serviceCode } = filters;
    
    // Build date filter for queries
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }
    
    const serviceFilter = serviceCode ? { serviceCode } : {};
    
    // Run all aggregations in parallel for performance
    const [
      engagementMetrics,
      revenueMetrics,
      userMetrics,
      communicationMetrics,
      resourceMetrics,
      questionnaireMetrics,
      feedbackMetrics,
      trends,
      topPerformers,
    ] = await Promise.all([
      calculateEngagementMetrics(dateFilter, serviceFilter),
      calculateRevenueMetrics(dateFilter, serviceFilter),
      calculateUserMetrics(dateFilter),
      calculateCommunicationMetrics(dateFilter, serviceFilter),
      calculateResourceMetrics(dateFilter, serviceFilter),
      calculateQuestionnaireMetrics(dateFilter, serviceFilter),
      calculateFeedbackMetrics(dateFilter, serviceFilter),
      calculateTrends(dateFilter, serviceFilter),
      calculateTopPerformers(dateFilter, serviceFilter),
    ]);
    
    const cacheDuration = Date.now() - startTime;
    
    // Create cached snapshot (fire and forget - don't await)
    createCachedSnapshot({
      engagementMetrics,
      revenueMetrics,
      userMetrics,
      communicationMetrics,
      resourceMetrics,
      questionnaireMetrics,
      feedbackMetrics,
      trends,
      topPerformers,
      cacheDuration,
    }).catch(err => logger.error('Error creating dashboard cache:', err));
    
    return {
      realtime: true,
      snapshotDate: new Date(),
      metrics: {
        engagements: engagementMetrics,
        revenue: revenueMetrics,
        users: userMetrics,
        communication: communicationMetrics,
        resources: resourceMetrics,
        questionnaires: questionnaireMetrics,
        feedback: feedbackMetrics,
      },
      trends: {
        engagements: trends.engagements,
        revenue: trends.revenue,
      },
      topPerformers,
    };
  } catch (error) {
    logger.error('Error generating dashboard metrics:', error);
    throw new ApiError(500, 'Failed to generate dashboard metrics');
  }
};

/**
 * Get cached dashboard metrics (faster)
 * @returns Latest cached dashboard data
 */
export const getCachedDashboard = async (): Promise<IDashboardStats | null> => {
  try {
    return await DashboardStats.findOne().sort({ snapshotDate: -1 });
  } catch (error) {
    logger.error('Error fetching cached dashboard:', error);
    return null;
  }
};

/**
 * Create cached snapshot of dashboard metrics
 * @param data - Dashboard data to cache
 */
const createCachedSnapshot = async (data: any): Promise<void> => {
  try {
    const {
      engagementMetrics,
      revenueMetrics,
      userMetrics,
      communicationMetrics,
      resourceMetrics,
      questionnaireMetrics,
      feedbackMetrics,
      trends,
      topPerformers,
      cacheDuration,
    } = data;
    
    await DashboardStats.create({
      snapshotDate: new Date(),
      
      // Engagement metrics
      totalEngagements: engagementMetrics.total,
      activeEngagements: engagementMetrics.active,
      completedEngagements: engagementMetrics.completed,
      stalledEngagements: engagementMetrics.stalled,
      engagementsNeedingFeedback: engagementMetrics.needingFeedback,
      
      // Revenue metrics
      totalRevenue: revenueMetrics.total,
      monthlyRevenue: revenueMetrics.monthly,
      quarterlyRevenue: revenueMetrics.quarterly,
      yearlyRevenue: revenueMetrics.yearly,
      averageOrderValue: revenueMetrics.averageOrderValue,
      
      // User metrics
      totalClients: userMetrics.total,
      newClientsThisMonth: userMetrics.newThisMonth,
      returningClients: userMetrics.returning,
      
      // Message metrics
      totalMessages: communicationMetrics.totalMessages,
      unreadMessages: communicationMetrics.unreadMessages,
      averageMessagesPerEngagement: communicationMetrics.averagePerEngagement,
      
      // Resource metrics
      totalResources: resourceMetrics.total,
      totalDownloads: resourceMetrics.totalDownloads,
      totalViews: resourceMetrics.totalViews,
      
      // Questionnaire metrics
      totalQuestionnaires: questionnaireMetrics.total,
      pendingQuestionnaires: questionnaireMetrics.pending,
      overdueQuestionnaires: questionnaireMetrics.overdue,
      averageCompletionRate: questionnaireMetrics.completionRate,
      
      // Feedback metrics
      averageRating: feedbackMetrics.averageRating,
      totalFeedback: feedbackMetrics.total,
      positiveFeedbackCount: feedbackMetrics.positive,
      negativeFeedbackCount: feedbackMetrics.negative,
      neutralFeedbackCount: feedbackMetrics.neutral,
      recommendationRate: feedbackMetrics.recommendationRate,
      
      // Trends
      engagementsTrend: trends.engagements,
      revenueTrend: trends.revenue,
      
      // Top performers
      topPerformingServices: topPerformers.services,
      topRatedServices: topPerformers.rated,
      
      // Metadata
      cacheDuration,
    });
    
    logger.info('Dashboard cache updated successfully');
  } catch (error) {
    logger.error('Error creating dashboard cache:', error);
  }
};

/**
 * Calculate engagement metrics
 */
const calculateEngagementMetrics = async (
  dateFilter: any,
  serviceFilter: any
): Promise<EngagementMetrics> => {
  const [
    total,
    active,
    completed,
    stalled,
    needingFeedback,
    averageProgress,
  ] = await Promise.all([
    Engagement.countDocuments({ ...dateFilter, ...serviceFilter }),
    Engagement.countDocuments({ ...dateFilter, ...serviceFilter, isActive: true, isCompleted: false }),
    Engagement.countDocuments({ ...dateFilter, ...serviceFilter, isCompleted: true }),
    progressService.checkStalledEngagements(7).then(list => list.length),
    completionService.getEngagementsNeedingFeedback().then(list => list.length),
    Engagement.aggregate([
      { $match: { ...dateFilter, ...serviceFilter } },
      { $group: { _id: null, avgProgress: { $avg: '$currentProgress' } } },
    ]).then(result => result[0]?.avgProgress || 0),
  ]);
  
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    total,
    active,
    completed,
    stalled,
    needingFeedback,
    completionRate: Math.round(completionRate * 10) / 10,
    averageProgress: Math.round(averageProgress * 10) / 10,
  };
};

/**
 * Calculate revenue metrics
 */
const calculateRevenueMetrics = async (
  dateFilter: any,
  serviceFilter: any
): Promise<RevenueMetrics> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  
  const [total, monthly, quarterly, yearly, avgOrder] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'PAID', ...dateFilter, ...serviceFilter } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]).then(result => result[0]?.total || 0),
    
    Order.aggregate([
      { $match: { status: 'PAID', paidAt: { $gte: firstDayOfMonth }, ...serviceFilter } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]).then(result => result[0]?.total || 0),
    
    Order.aggregate([
      { $match: { status: 'PAID', paidAt: { $gte: firstDayOfQuarter }, ...serviceFilter } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]).then(result => result[0]?.total || 0),
    
    Order.aggregate([
      { $match: { status: 'PAID', paidAt: { $gte: firstDayOfYear }, ...serviceFilter } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]).then(result => result[0]?.total || 0),
    
    Order.aggregate([
      { $match: { status: 'PAID', ...dateFilter, ...serviceFilter } },
      { $group: { _id: null, avg: { $avg: '$finalAmount' } } },
    ]).then(result => result[0]?.avg || 0),
  ]);
  
  return {
    total,
    monthly,
    quarterly,
    yearly,
    averageOrderValue: Math.round(avgOrder),
    projectedAnnual: monthly * 12,
  };
};

/**
 * Calculate user metrics
 */
const calculateUserMetrics = async (
  dateFilter: any
): Promise<UserMetrics> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const [total, newThisMonth, returning, avgEngagements] = await Promise.all([
    User.countDocuments({ ...dateFilter }),
    User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    User.aggregate([
      { $match: { engagements: { $exists: true, $ne: [] } } },
      { $count: 'count' },
    ]).then(result => result[0]?.count || 0),
    User.aggregate([
      { $project: { engagementCount: { $size: '$engagements' } } },
      { $group: { _id: null, avg: { $avg: '$engagementCount' } } },
    ]).then(result => result[0]?.avg || 0),
  ]);
  
  const retentionRate = total > 0 ? (returning / total) * 100 : 0;
  
  return {
    total,
    newThisMonth,
    returning,
    retentionRate: Math.round(retentionRate * 10) / 10,
    averageEngagementsPerUser: Math.round(avgEngagements * 10) / 10,
  };
};

/**
 * Calculate communication metrics
 */
const calculateCommunicationMetrics = async (
  dateFilter: any,
  serviceFilter: any
): Promise<CommunicationMetrics> => {
  const [totalMessages, unreadMessages, adminMessages, clientMessages, avgPerEngagement] = await Promise.all([
    Message.countDocuments({ ...dateFilter }),
    Message.countDocuments({ isRead: false }),
    Message.countDocuments({ senderType: 'admin', ...dateFilter }),
    Message.countDocuments({ senderType: 'client', ...dateFilter }),
    Message.aggregate([
      { $group: { _id: '$engagementId', count: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: '$count' } } },
    ]).then(result => result[0]?.avg || 0),
  ]);
  
  return {
    totalMessages,
    unreadMessages,
    averagePerEngagement: Math.round(avgPerEngagement * 10) / 10,
    messagesByType: {
      admin: adminMessages,
      client: clientMessages,
    },
  };
};

/**
 * Calculate resource metrics
 */
const calculateResourceMetrics = async (
  dateFilter: any,
  serviceFilter: any
): Promise<ResourceMetrics> => {
  const [total, downloads, views, avgPerEngagement, byType] = await Promise.all([
    Resource.countDocuments({ ...dateFilter, ...serviceFilter }),
    Resource.aggregate([
      { $match: { ...dateFilter, ...serviceFilter } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } },
    ]).then(result => result[0]?.total || 0),
    Resource.aggregate([
      { $match: { ...dateFilter, ...serviceFilter } },
      { $group: { _id: null, total: { $sum: '$viewCount' } } },
    ]).then(result => result[0]?.total || 0),
    Resource.aggregate([
      { $match: { ...dateFilter, ...serviceFilter } },
      { $group: { _id: '$engagementId', count: { $sum: 1 } } },
      { $group: { _id: null, avg: { $avg: '$count' } } },
    ]).then(result => result[0]?.avg || 0),
    Resource.aggregate([
      { $match: { ...dateFilter, ...serviceFilter } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]).then(result => {
      const byType: Record<string, number> = {};
      result.forEach(item => { byType[item._id] = item.count; });
      return byType;
    }),
  ]);
  
  return {
    total,
    totalDownloads: downloads,
    totalViews: views,
    averageEngagement: Math.round(avgPerEngagement * 10) / 10,
    byType,
  };
};

/**
 * Calculate questionnaire metrics
 */
const calculateQuestionnaireMetrics = async (
  dateFilter: any,
  serviceFilter: any
): Promise<QuestionnaireMetrics> => {
  const [total, pending, overdue, completed, avgTime] = await Promise.all([
    Questionnaire.countDocuments({ ...dateFilter, ...serviceFilter }),
    Questionnaire.countDocuments({ status: 'pending', ...dateFilter, ...serviceFilter }),
    Questionnaire.countDocuments({ status: 'overdue', ...dateFilter, ...serviceFilter }),
    Questionnaire.countDocuments({ status: 'submitted', ...dateFilter, ...serviceFilter }),
    Questionnaire.aggregate([
      { $match: { status: 'submitted', timeSpent: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$timeSpent' } } },
    ]).then(result => result[0]?.avg || 0),
  ]);
  
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  return {
    total,
    pending,
    overdue,
    completed,
    completionRate: Math.round(completionRate * 10) / 10,
    averageTimeToComplete: Math.round(avgTime / 60), // Convert to minutes
  };
};

/**
 * Calculate feedback metrics
 */
const calculateFeedbackMetrics = async (
  dateFilter: any,
  serviceFilter: any
): Promise<FeedbackMetrics> => {
  const feedbackStats = await feedbackService.getFeedbackStats(dateFilter);
  
  // Get rating distribution
  const distribution = await Feedback.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  
  const distMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach(item => {
    distMap[item._id] = item.count;
  });
  
  // Get would use again rate
  const wouldUseAgainStats = await Feedback.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$wouldUseAgain', count: { $sum: 1 } } },
  ]);
  
  const wouldUseAgainCount = wouldUseAgainStats.find(s => s._id === true)?.count || 0;
  const wouldUseAgainRate = feedbackStats.totalCount > 0 
    ? (wouldUseAgainCount / feedbackStats.totalCount) * 100 
    : 0;
  
  return {
    total: feedbackStats.totalCount,
    averageRating: feedbackStats.averageRating,
    distribution: distMap,
    positive: distMap[4] + distMap[5],
    neutral: distMap[3],
    negative: distMap[1] + distMap[2],
    recommendationRate: feedbackStats.recommendRate,
    wouldUseAgainRate: Math.round(wouldUseAgainRate * 10) / 10,
  };
};

/**
 * Calculate trends (last 30 days)
 */
const calculateTrends = async (
  dateFilter: any,
  serviceFilter: any
): Promise<{ engagements: any[]; revenue: any[] }> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [engagements, revenue] = await Promise.all([
    Engagement.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          ...serviceFilter,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]),
    
    Order.aggregate([
      {
        $match: {
          status: 'PAID',
          paidAt: { $gte: thirtyDaysAgo },
          ...serviceFilter,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          amount: { $sum: '$finalAmount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          amount: 1,
          _id: 0,
        },
      },
    ]),
  ]);
  
  return {
    engagements: engagements.map(e => ({ date: new Date(e.date), count: e.count })),
    revenue: revenue.map(r => ({ date: new Date(r.date), amount: r.amount })),
  };
};

/**
 * Calculate top performing services
 */
const calculateTopPerformers = async (
  dateFilter: any,
  serviceFilter: any
): Promise<{ services: TopService[]; rated: TopRatedService[] }> => {
  const [services, rated] = await Promise.all([
    Engagement.aggregate([
      { $match: { ...dateFilter, ...serviceFilter } },
      {
        $group: {
          _id: '$serviceCode',
          serviceName: { $first: '$serviceName' },
          engagementCount: { $sum: 1 },
        },
      },
      { $sort: { engagementCount: -1 } },
      { $limit: 5 },
    ]),
    
    Feedback.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'engagements',
          localField: 'engagementId',
          foreignField: '_id',
          as: 'engagement',
        },
      },
      { $unwind: '$engagement' },
      {
        $group: {
          _id: '$engagement.serviceCode',
          serviceName: { $first: '$engagement.serviceName' },
          averageRating: { $avg: '$rating' },
          feedbackCount: { $sum: 1 },
        },
      },
      { $match: { feedbackCount: { $gte: 2 } } }, // Minimum 2 feedbacks to qualify
      { $sort: { averageRating: -1, feedbackCount: -1 } },
      { $limit: 5 },
    ]),
  ]);
  
  // Add revenue to top services
  const servicesWithRevenue = await Promise.all(
    services.map(async (service) => {
      const revenue = await Order.aggregate([
        {
          $match: {
            serviceCode: service._id,
            status: 'PAID',
            ...dateFilter,
          },
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]).then(r => r[0]?.total || 0);
      
      return {
        serviceCode: service._id,
        serviceName: service.serviceName,
        engagementCount: service.engagementCount,
        revenue,
      };
    })
  );
  
  return {
    services: servicesWithRevenue,
    rated: rated.map(r => ({
      serviceCode: r._id,
      serviceName: r.serviceName,
      averageRating: Math.round(r.averageRating * 10) / 10,
      feedbackCount: r.feedbackCount,
    })),
  };
};

/**
 * Refresh dashboard cache manually
 * Can be called via cron job or after important events
 */
export const refreshDashboardCache = async (): Promise<void> => {
  try {
    await generateDashboardMetrics();
    logger.info('Dashboard cache refreshed manually');
  } catch (error) {
    logger.error('Error refreshing dashboard cache:', error);
    throw new ApiError(500, 'Failed to refresh dashboard cache');
  }
};

/**
 * Get dashboard summary (lightweight version for sidebar/widgets)
 */
export const getDashboardSummary = async (): Promise<any> => {
  try {
    const cached = await getCachedDashboard();
    
    if (cached) {
      return {
        realtime: false,
        snapshotDate: cached.snapshotDate,
        summary: {
          totalEngagements: cached.totalEngagements,
          activeEngagements: cached.activeEngagements,
          completedEngagements: cached.completedEngagements,
          stalledEngagements: cached.stalledEngagements,
          totalRevenue: cached.totalRevenue,
          monthlyRevenue: cached.monthlyRevenue,
          totalClients: cached.totalClients,
          unreadMessages: cached.unreadMessages,
          pendingQuestionnaires: cached.pendingQuestionnaires,
          averageRating: cached.averageRating,
        },
      };
    }
    
    // If no cache, generate real-time data
    const realtime = await generateDashboardMetrics();
    
    return {
      realtime: true,
      snapshotDate: realtime.snapshotDate,
      summary: {
        totalEngagements: realtime.metrics.engagements.total,
        activeEngagements: realtime.metrics.engagements.active,
        completedEngagements: realtime.metrics.engagements.completed,
        stalledEngagements: realtime.metrics.engagements.stalled,
        totalRevenue: realtime.metrics.revenue.total,
        monthlyRevenue: realtime.metrics.revenue.monthly,
        totalClients: realtime.metrics.users.total,
        unreadMessages: realtime.metrics.communication.unreadMessages,
        pendingQuestionnaires: realtime.metrics.questionnaires.pending,
        averageRating: realtime.metrics.feedback.averageRating,
      },
    };
  } catch (error) {
    logger.error('Error getting dashboard summary:', error);
    throw new ApiError(500, 'Failed to get dashboard summary');
  }
};