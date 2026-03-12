import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const notificationController = {

  /**
   * GET /notifications
   * User token required.
   * Returns all notifications for the authenticated user, newest first.
   */
  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await notificationService.getNotificationsForUser(req.userId!);

      res.status(200).json(
        formatResponse(true, 'Notifications retrieved.', {
          notifications,
          total:  notifications.length,
          unread: notifications.filter((n) => !n.isRead).length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /notifications/admin
   * Admin token required.
   * Returns all admin-directed notifications, newest first.
   */
  async getAdminNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await notificationService.getNotificationsForAdmin();

      res.status(200).json(
        formatResponse(true, 'Notifications retrieved.', {
          notifications,
          total:  notifications.length,
          unread: notifications.filter((n) => !n.isRead).length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /notifications/:id/read
   * User or admin token.
   * Marks one notification as read. Silently succeeds if already read.
   * Returns 404 if notification does not exist or does not belong to requester.
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin      = !!req.adminId;
      const requesterId  = isAdmin ? req.adminId! : req.userId!;
      const requesterRole = isAdmin ? 'admin' : 'user';

      const notification = await notificationService.markAsRead(
        // FIX: Explicitly cast Express param to string
        req.params.id as string,
        requesterId,
        requesterRole as 'user' | 'admin'
      );

      if (!notification) {
        throw new AppError('Notification not found.', 404);
      }

      res.status(200).json(
        formatResponse(true, 'Notification marked as read.', notification)
      );
    } catch (err) {
      next(err);
    }
  },
};