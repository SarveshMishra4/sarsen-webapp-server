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

// PHASE 7: Questionnaire-related type definitions

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

// PHASE 7: Resource-related type definitions

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