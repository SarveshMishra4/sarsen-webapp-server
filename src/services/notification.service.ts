/**
 * Notification Service
 * 
 * Handles admin notifications for important events:
 * - New engagements created
 * - Questionnaires submitted
 * - Feedback received
 * - Engagements completed
 * - Stalled engagements detected
 * - Overdue questionnaires
 */

import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';

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

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  data?: any;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// In-memory store for notifications (in production, use Redis or database)
let notifications: Notification[] = [];
const MAX_NOTIFICATIONS = 100;

/**
 * Create a new notification
 * @param type - Notification type
 * @param title - Notification title
 * @param message - Notification message
 * @param severity - Severity level
 * @param data - Optional additional data
 * @param expiresIn - Optional expiry time in hours
 * @returns Created notification
 */
export const createNotification = (
  type: NotificationType,
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'success' | 'error' = 'info',
  data?: any,
  expiresIn: number = 48 // Default 48 hours
): Notification => {
  const notification: Notification = {
    id: generateNotificationId(),
    type,
    title,
    message,
    severity,
    data,
    read: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000),
  };
  
  notifications.unshift(notification); // Add to beginning
  
  // Keep only last MAX_NOTIFICATIONS
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications = notifications.slice(0, MAX_NOTIFICATIONS);
  }
  
  logger.info(`Notification created: ${type} - ${title}`);
  
  return notification;
};

/**
 * Generate unique notification ID
 * @returns Unique ID string
 */
const generateNotificationId = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get all notifications for admin
 * @param unreadOnly - If true, return only unread notifications
 * @param limit - Maximum number of notifications to return
 * @returns Array of notifications
 */
export const getNotifications = (
  unreadOnly: boolean = false,
  limit: number = 50
): Notification[] => {
  let filtered = notifications.filter(n => !n.expiresAt || n.expiresAt > new Date());
  
  if (unreadOnly) {
    filtered = filtered.filter(n => !n.read);
  }
  
  return filtered.slice(0, limit);
};

/**
 * Mark notification as read
 * @param notificationId - Notification ID
 */
export const markAsRead = (notificationId: string): void => {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = (): void => {
  notifications.forEach(n => {
    n.read = true;
  });
};

/**
 * Clear old notifications
 * Removes expired and read notifications older than 7 days
 */
export const clearOldNotifications = (): void => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  notifications = notifications.filter(n => 
    !n.read || n.createdAt > sevenDaysAgo
  );
};

/**
 * Get unread count
 * @returns Number of unread notifications
 */
export const getUnreadCount = (): number => {
  return notifications.filter(n => !n.read && (!n.expiresAt || n.expiresAt > new Date())).length;
};

// Event handlers for automatic notifications

/**
 * Handle new engagement created
 */
export const onEngagementCreated = (engagement: any): void => {
  createNotification(
    'engagement.created',
    'New Engagement Created',
    `Engagement ${engagement.engagementId} for ${engagement.serviceName} has been created.`,
    'success',
    { engagementId: engagement._id, engagementCode: engagement.engagementId }
  );
};

/**
 * Handle engagement completed
 */
export const onEngagementCompleted = (engagement: any): void => {
  createNotification(
    'engagement.completed',
    'Engagement Completed',
    `Engagement ${engagement.engagementId} has been successfully completed.`,
    'success',
    { engagementId: engagement._id, engagementCode: engagement.engagementId }
  );
};

/**
 * Handle questionnaire submitted
 */
export const onQuestionnaireSubmitted = (questionnaire: any): void => {
  createNotification(
    'questionnaire.submitted',
    'Questionnaire Submitted',
    `Questionnaire "${questionnaire.title}" has been submitted.`,
    'info',
    { questionnaireId: questionnaire._id }
  );
};

/**
 * Handle feedback received
 */
export const onFeedbackReceived = (feedback: any): void => {
  createNotification(
    'feedback.received',
    'New Feedback Received',
    `Feedback with rating ${feedback.rating}/5 has been received.`,
    feedback.rating >= 4 ? 'success' : feedback.rating >= 3 ? 'info' : 'warning',
    { feedbackId: feedback._id }
  );
};

/**
 * Handle payment received
 */
export const onPaymentReceived = (order: any): void => {
  createNotification(
    'payment.received',
    'Payment Received',
    `Payment of ₹${order.finalAmount / 100} received for ${order.serviceName}.`,
    'success',
    { orderId: order._id }
  );
};

/**
 * Handle stalled engagement detected
 */
export const onStalledEngagement = (engagement: any): void => {
  createNotification(
    'engagement.stalled',
    'Stalled Engagement Detected',
    `Engagement ${engagement.engagementId} has had no progress for 7+ days.`,
    'warning',
    { engagementId: engagement._id }
  );
};

/**
 * Handle overdue questionnaire
 */
export const onOverdueQuestionnaire = (questionnaire: any): void => {
  createNotification(
    'questionnaire.overdue',
    'Questionnaire Overdue',
    `Questionnaire "${questionnaire.title}" is now overdue.`,
    'warning',
    { questionnaireId: questionnaire._id }
  );
};

/**
 * Handle system alert
 */
export const onSystemAlert = (message: string, data?: any): void => {
  createNotification(
    'system.alert',
    'System Alert',
    message,
    'error',
    data
  );
};

// Cleanup interval (run every hour)
setInterval(clearOldNotifications, 60 * 60 * 1000);