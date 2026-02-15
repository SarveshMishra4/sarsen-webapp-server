/**
 * Dashboard Stats Model
 * 
 * Caches aggregated dashboard metrics for faster loading.
 * Updated periodically via cron job or after relevant events.
 * Reduces load on database by avoiding complex aggregations on every request.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IDashboardStats extends Document {
  // Snapshot timestamp
  snapshotDate: Date;
  
  // Core engagement metrics
  totalEngagements: number;
  activeEngagements: number;
  completedEngagements: number;
  stalledEngagements: number;
  engagementsNeedingFeedback: number;
  
  // Revenue metrics
  totalRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  yearlyRevenue: number;
  averageOrderValue: number;
  
  // User metrics
  totalClients: number;
  newClientsThisMonth: number;
  returningClients: number;
  
  // Message metrics
  totalMessages: number;
  unreadMessages: number;
  averageMessagesPerEngagement: number;
  
  // Resource metrics
  totalResources: number;
  totalDownloads: number;
  totalViews: number;
  
  // Questionnaire metrics
  totalQuestionnaires: number;
  pendingQuestionnaires: number;
  overdueQuestionnaires: number;
  averageCompletionRate: number;
  
  // Feedback metrics
  averageRating: number;
  totalFeedback: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  neutralFeedbackCount: number;
  recommendationRate: number;
  
  // Trend data (last 30 days)
  engagementsTrend: {
    date: Date;
    count: number;
  }[];
  
  revenueTrend: {
    date: Date;
    amount: number;
  }[];
  
  // Top performing
  topPerformingServices: {
    serviceCode: string;
    serviceName: string;
    engagementCount: number;
    revenue: number;
  }[];
  
  topRatedServices: {
    serviceCode: string;
    serviceName: string;
    averageRating: number;
    feedbackCount: number;
  }[];
  
  // Metadata
  cacheDuration: number; // Time taken to generate this snapshot (ms)
  createdAt: Date;
  updatedAt: Date;
}

const DashboardStatsSchema = new Schema<IDashboardStats>(
  {
    snapshotDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    
    // Core engagement metrics
    totalEngagements: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeEngagements: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedEngagements: {
      type: Number,
      default: 0,
      min: 0,
    },
    stalledEngagements: {
      type: Number,
      default: 0,
      min: 0,
    },
    engagementsNeedingFeedback: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Revenue metrics
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    quarterlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    yearlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // User metrics
    totalClients: {
      type: Number,
      default: 0,
      min: 0,
    },
    newClientsThisMonth: {
      type: Number,
      default: 0,
      min: 0,
    },
    returningClients: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Message metrics
    totalMessages: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadMessages: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageMessagesPerEngagement: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Resource metrics
    totalResources: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDownloads: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Questionnaire metrics
    totalQuestionnaires: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingQuestionnaires: {
      type: Number,
      default: 0,
      min: 0,
    },
    overdueQuestionnaires: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageCompletionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // Feedback metrics
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalFeedback: {
      type: Number,
      default: 0,
      min: 0,
    },
    positiveFeedbackCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    negativeFeedbackCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    neutralFeedbackCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    recommendationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    // Trend data
    engagementsTrend: [{
      date: Date,
      count: Number,
    }],
    
    revenueTrend: [{
      date: Date,
      amount: Number,
    }],
    
    // Top performing
    topPerformingServices: [{
      serviceCode: String,
      serviceName: String,
      engagementCount: Number,
      revenue: Number,
    }],
    
    topRatedServices: [{
      serviceCode: String,
      serviceName: String,
      averageRating: Number,
      feedbackCount: Number,
    }],
    
    // Metadata
    cacheDuration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching latest snapshot
DashboardStatsSchema.index({ snapshotDate: -1 });

export const DashboardStats = mongoose.model<IDashboardStats>('DashboardStats', DashboardStatsSchema);