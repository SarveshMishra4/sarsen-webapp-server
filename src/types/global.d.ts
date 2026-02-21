/**
 * Global Type Definitions
 * 
 * This file extends Express Request type to include user information
 * after authentication middleware runs.
 */

import 'express';
import { MilestoneType } from '../constants/milestones';

declare global {
  namespace Express {
    export interface Request {
      /**
       * Admin user information attached by adminAuth middleware
       */
      admin?: {
        id: string;
        email: string;
        role: string;
      };
      
      /**
       * Client user information attached by clientAuth middleware
       */
      client?: {
        id: string;
        engagementId?: string; // Made optional for multi-engagement views
        email: string;
      };
      
      /**
       * Engagement information for client-scoped requests
       */
      engagement?: {
        id: string;
        userId: string;
        progress: number;
        messagingAllowed: boolean;
      };
    }
  }
}

// Type exports for JWT payloads used in token.service.ts
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface AdminTokenPayload extends TokenPayload {
  role: 'ADMIN';
}

export interface ClientTokenPayload extends TokenPayload {
  role: 'CLIENT';
  engagementId?: string;
}

// Phase 3: Blueprint-related type definitions
export interface BlueprintResource {
  type: 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image';
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  order: number;
  isRequired: boolean;
}

export interface BlueprintSection {
  title: string;
  description?: string;
  type: 'milestones' | 'resources' | 'questionnaires' | 'instructions' | 'custom';
  order: number;
  content?: any;
}

export interface BlueprintMilestone {
  value: number; // Should be from MILESTONES constants
  label: string;
  description?: string;
  order: number;
  isAutomatic: boolean;
}

export interface ServiceBlueprintData {
  serviceCode: string;
  serviceName: string;
  serviceSlug: string;
  milestones: BlueprintMilestone[];
  sections: BlueprintSection[];
  resources: BlueprintResource[];
  defaultProgress: number;
  messagingEnabledByDefault: boolean;
  version: number;
  isActive: boolean;
}

// Phase 4: Client-related type definitions
export interface ClientUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  isActive: boolean;
  engagements: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientLoginResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  engagementId?: string;
  accessToken: string;
  refreshToken: string;
}

export interface ClientAuthRequest {
  email: string;
  password: string;
  engagementId?: string;
}

// Phase 5: Engagement and Order related type definitions
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface EngagementMilestone {
  value: MilestoneType;
  label: string;
  description?: string;
  order: number;
  isAutomatic: boolean;
  completedAt?: Date;
}

export interface EngagementProgressHistory {
  value: MilestoneType;
  updatedAt: Date;
  updatedBy: string; // Admin ID
  note?: string;
}

export interface EngagementResource {
  type: 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image';
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  order: number;
  isRequired: boolean;
  addedAt: Date;
}

export interface EngagementData {
  engagementId: string;
  serviceCode: string;
  serviceName: string;
  userId: string;
  currentProgress: MilestoneType;
  messagingAllowed: boolean;
  isActive: boolean;
  isCompleted: boolean;
  messageCount: number;
  resourceCount: number;
  questionnaireCount: number;
  startDate: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementSummary {
  id: string;
  engagementId: string;
  serviceCode: string;
  serviceName: string;
  currentProgress: MilestoneType;
  isCompleted: boolean;
  isActive: boolean;
  messagingAllowed: boolean;
  messageCount: number;
  resourceCount: number;
  questionnaireCount: number;
  startDate: Date;
  updatedAt: Date;
}

export interface OrderData {
  orderId: string;
  receipt: string;
  email: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: string;
  finalAmount: number;
  status: OrderStatus;
  paymentId?: string;
  userId?: string;
  engagementId?: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface CreateOrderResponse {
  order: OrderData;
  razorpayOrder: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
}

export interface CreateEngagementFromPaymentInput {
  orderId: string;
  email: string;
  serviceCode: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
  };
}

export interface AdminDashboardStats {
  totalEngagements: number;
  activeEngagements: number;
  completedEngagements: number;
  recentEngagements: EngagementData[];
  stalledEngagements: number; // Phase 8: New metric
  // PHASE 9: Enhanced dashboard stats with feedback metrics
  feedback?: {
    totalCount: number;
    averageRating: number;
    recommendRate: number;
    engagementsNeedingFeedback: number;
  };
}

// Phase 6: Message-related type definitions
export type SenderType = 'admin' | 'client';

export interface MessageAttachment {
  type: string;
  url: string;
  name: string;
  size?: number;
}

export interface MessageData {
  id: string;
  engagementId: string;
  senderId: string;
  senderType: SenderType;
  senderName?: string;
  content: string;
  attachments?: MessageAttachment[];
  isRead: boolean;
  readBy?: {
    userId: string;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageInput {
  engagementId: string;
  content: string;
  attachments?: MessageAttachment[];
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export interface MessagesResponse {
  messages: MessageData[];
  total: number;
  unreadCount: number;
}

export interface RecentMessageItem {
  id: string;
  content: string;
  senderType: SenderType;
  senderName?: string;
  createdAt: Date;
  engagement: {
    engagementId: string;
    serviceName: string;
  };
}

// Phase 7: Questionnaire-related type definitions
export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'date';
export type QuestionnaireStatus = 'pending' | 'submitted' | 'overdue' | 'cancelled';

export interface QuestionnaireQuestion {
  id?: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  required: boolean;
  order: number;
  answer?: any;
  fileUrl?: string;
}

export interface QuestionnaireData {
  id: string;
  engagementId: string;
  createdBy: string;
  title: string;
  description?: string;
  instructions?: string;
  questions: QuestionnaireQuestion[];
  status: QuestionnaireStatus;
  sentAt: Date;
  deadline?: Date;
  submittedAt?: Date;
  submittedBy?: string;
  timeSpent?: number;
  totalQuestions: number;
  answeredQuestions: number;
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuestionnaireInput {
  engagementId: string;
  title: string;
  description?: string;
  instructions?: string;
  questions: Omit<QuestionnaireQuestion, 'id' | 'answer' | 'fileUrl'>[];
  deadline?: string;
}

export interface SubmitQuestionnaireInput {
  answers: {
    questionId: string;
    answer: any;
    fileUrl?: string;
  }[];
  timeSpent?: number;
}

// Phase 7: Resource-related type definitions
export type ResourceType = 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image' | 'other';

export interface ResourceData {
  id: string;
  engagementId: string;
  sharedBy: string;
  sharedByName?: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  icon?: string;
  thumbnailUrl?: string;
  downloadCount: number;
  viewCount: number;
  lastAccessedAt?: Date;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareResourceInput {
  engagementId: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  icon?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

export interface ResourceFilters {
  type?: ResourceType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ResourceStats {
  byType: Record<string, number>;
  total: number;
}

// Phase 8: Progress-related type definitions
export type UpdatedByType = 'admin' | 'system';

export interface ProgressHistoryEntry {
  id: string;
  engagementId: string;
  updatedBy: string;
  updatedByType: UpdatedByType;
  fromValue: MilestoneType;
  toValue: MilestoneType;
  timeAtMilestone?: number;
  note?: string;
  isAutomatic: boolean;
  createdAt: Date;
}

export interface ProgressUpdateInput {
  engagementId: string;
  newProgress: number;
  adminId: string;
  note?: string;
  isAutomatic?: boolean;
}

export interface ProgressValidationResult {
  isValid: boolean;
  message?: string;
  allowedTransitions?: MilestoneType[];
}

export interface MilestoneTiming {
  milestone: MilestoneType;
  reachedAt: Date;
  timeSpent?: number; // Time until next milestone (seconds)
}

export interface ProgressAnalytics {
  currentProgress: MilestoneType;
  isCompleted: boolean;
  completedAt?: Date;
  startDate: Date;
  totalDuration?: number; // seconds
  totalUpdates: number;
  averageTimePerMilestone: Record<string, number>; // milestone label -> avg seconds
  timeline: MilestoneTiming[];
}

export interface StalledEngagement {
  engagementId: string;
  serviceName: string;
  currentProgress: MilestoneType;
  lastUpdate: Date;
  totalHistory: number;
}

// Phase 9: Feedback-related type definitions
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface FeedbackData {
  id: string;
  engagementId: string;
  userId: string;
  rating: FeedbackRating;
  review?: string;
  wouldRecommend: boolean;
  wouldUseAgain: boolean;
  communication?: FeedbackRating;
  quality?: FeedbackRating;
  timeliness?: FeedbackRating;
  value?: FeedbackRating;
  whatWorkedWell?: string[];
  whatCouldBeImproved?: string[];
  additionalComments?: string;
  allowTestimonial: boolean;
  testimonial?: string;
  isHighlighted: boolean;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  engagement?: {
    engagementId: string;
    serviceName: string;
  };
}

export interface SubmitFeedbackInput {
  engagementId: string;
  rating: FeedbackRating;
  review?: string;
  wouldRecommend: boolean;
  wouldUseAgain: boolean;
  communication?: FeedbackRating;
  quality?: FeedbackRating;
  timeliness?: FeedbackRating;
  value?: FeedbackRating;
  whatWorkedWell?: string[];
  whatCouldBeImproved?: string[];
  additionalComments?: string;
  allowTestimonial?: boolean;
  testimonial?: string;
  timeSpent?: number;
}

export interface FeedbackFilters {
  rating?: FeedbackRating;
  startDate?: string;
  endDate?: string;
  isHighlighted?: boolean;
  page?: number;
  limit?: number;
}

export interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  recommendRate: number;
  wouldUseAgainRate: number;
  averageCommunication?: number;
  averageQuality?: number;
  averageTimeliness?: number;
  averageValue?: number;
  commonPraises: string[];
  commonImprovements: string[];
}

export interface FeedbackResponse {
  feedback: FeedbackData[];
  total: number;
  pages: number;
  stats: FeedbackStats;
}

// Phase 9: Completion status types
export type AccessMode = 'full' | 'feedback-required' | 'read-only';

export interface CompletionStatus {
  isCompleted: boolean;
  hasFeedback: boolean;
  canAccess: boolean;
  accessMode: AccessMode;
  completedAt?: Date;
  feedbackSubmittedAt?: Date;
}

export interface EngagementWithCompletion extends EngagementData {
  completionStatus?: CompletionStatus;
}

export interface EngagementAccessInfo {
  canAccess: boolean;
  accessMode: AccessMode;
  requiresFeedback: boolean;
  isCompleted: boolean;
}

// PHASE 10: Dashboard and Notification related type definitions

export type NotificationType = 
  | 'engagement.created'
  | 'engagement.completed'
  | 'questionnaire.submitted'
  | 'questionnaire.overdue'
  | 'feedback.received'
  | 'message.unread'
  | 'engagement.stalled'
  | 'payment.received'
  | 'system.alert';

export type NotificationSeverity = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  data?: any;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  serviceCode?: string;
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

export interface DashboardSummary {
  realtime: boolean;
  snapshotDate: Date;
  summary: {
    totalEngagements: number;
    activeEngagements: number;
    completedEngagements: number;
    stalledEngagements: number;
    totalRevenue: number;
    monthlyRevenue: number;
    totalClients: number;
    unreadMessages: number;
    pendingQuestionnaires: number;
    averageRating: number;
  };
}

export interface DashboardStatsData {
  snapshotDate: Date;
  totalEngagements: number;
  activeEngagements: number;
  completedEngagements: number;
  stalledEngagements: number;
  engagementsNeedingFeedback: number;
  totalRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  yearlyRevenue: number;
  averageOrderValue: number;
  totalClients: number;
  newClientsThisMonth: number;
  returningClients: number;
  totalMessages: number;
  unreadMessages: number;
  averageMessagesPerEngagement: number;
  totalResources: number;
  totalDownloads: number;
  totalViews: number;
  totalQuestionnaires: number;
  pendingQuestionnaires: number;
  overdueQuestionnaires: number;
  averageCompletionRate: number;
  averageRating: number;
  totalFeedback: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  neutralFeedbackCount: number;
  recommendationRate: number;
  engagementsTrend: { date: Date; count: number }[];
  revenueTrend: { date: Date; amount: number }[];
  topPerformingServices: TopService[];
  topRatedServices: TopRatedService[];
  cacheDuration: number;
  createdAt: Date;
  updatedAt: Date;
}