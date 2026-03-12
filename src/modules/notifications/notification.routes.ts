import { Router, Request, Response, NextFunction } from 'express';
import { notificationController } from './notification.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// Combined auth — mark-as-read works for both user and admin tokens
const requireUserOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireUser(req, res, (userErr?: any) => {
    if (!userErr) return next();
    requireAdmin(req, res, (adminErr?: any) => {
      if (!adminErr) return next();
      next(userErr);
    });
  });
};

// GET /notifications — user retrieves their own notifications
router.get('/', requireUser, notificationController.getUserNotifications);

// GET /notifications/admin — admin retrieves all admin notifications
router.get('/admin', requireAdmin, notificationController.getAdminNotifications);

// PATCH /notifications/:id/read — user or admin marks a notification as read
router.patch('/:id/read', requireUserOrAdmin, notificationController.markAsRead);

export default router;
