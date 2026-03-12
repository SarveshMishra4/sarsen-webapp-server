import { Notification, INotification, NotificationType, RecipientRole } from './notification.model.js';
import { logger } from '../../core/logger/logger.js';

export interface CreateNotificationInput {
  recipientId:   string;
  recipientRole: RecipientRole;
  type:          NotificationType;
  message:       string;
  engagementId?: string;
}

export const notificationService = {

  /**
   * createNotification
   *
   * Called by every other service when a notifiable event occurs.
   * Never throws — notification failure must never break the calling operation.
   * Errors are logged but silently swallowed.
   */
  async createNotification(input: CreateNotificationInput): Promise<void> {
    try {
      await Notification.create({
        recipientId:   input.recipientId,
        recipientRole: input.recipientRole,
        type:          input.type,
        message:       input.message,
        // FIX: Only insert the 'engagementId' key if it actually exists.
        // This prevents passing { engagementId: undefined } to Mongoose.
        ...(input.engagementId !== undefined ? { engagementId: input.engagementId } : {}),
        isRead:        false,
      });

      logger.info('[Notifications] Notification created', {
        type:          input.type,
        recipientRole: input.recipientRole,
        recipientId:   input.recipientId,
      });
    } catch (err) {
      // Notification failure must never propagate — log and continue
      logger.error('[Notifications] Failed to create notification', err as Error);
    }
  },

  /**
   * getNotificationsForUser
   *
   * Returns all notifications for a specific user sorted newest first.
   */
  async getNotificationsForUser(userId: string): Promise<INotification[]> {
    return Notification.find({ recipientId: userId, recipientRole: 'user' })
      .sort({ createdAt: -1 });
  },

  /**
   * getNotificationsForAdmin
   *
   * Returns all admin notifications sorted newest first.
   * Admin notifications are not scoped to a specific admin —
   * all admins see the same pool of admin-directed notifications.
   */
  async getNotificationsForAdmin(): Promise<INotification[]> {
    return Notification.find({ recipientRole: 'admin' })
      .sort({ createdAt: -1 });
  },

  /**
   * markAsRead
   *
   * Marks a single notification as read.
   * Verifies the notification belongs to the requester before marking.
   */
  async markAsRead(
    notificationId: string,
    requesterId: string,
    requesterRole: RecipientRole
  ): Promise<INotification | null> {
    const query = requesterRole === 'admin'
      ? { _id: notificationId, recipientRole: 'admin' }
      : { _id: notificationId, recipientId: requesterId, recipientRole: 'user' };

    return Notification.findOneAndUpdate(
      query,
      { isRead: true },
      { new: true }
    );
  },
};