import { Router, Request, Response, NextFunction } from 'express';
import { messageController } from './message.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

/**
 * Message routes are nested under /engagements/:id/messages
 * with mergeParams: true so req.params.id (engagementId) is available.
 *
 * requireUserOrAdmin middleware tries the user token first, then admin.
 * If neither succeeds, it returns 401.
 * The controller then checks req.adminId vs req.userId to set senderRole.
 */

const router = Router({ mergeParams: true });

// Middleware that accepts either a valid user JWT or a valid admin JWT.
// Tries user first. If user auth fails, tries admin. If both fail, returns 401.
const requireUserOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireUser(req, res, (userErr?: any) => {
    if (!userErr) return next(); // user token valid — proceed
    requireAdmin(req, res, (adminErr?: any) => {
      if (!adminErr) return next(); // admin token valid — proceed
      // Both failed — return the user error (generic 401)
      next(userErr);
    });
  });
};

// POST /engagements/:id/messages — user or admin sends a message
router.post('/', requireUserOrAdmin, messageController.sendMessage);

// GET /engagements/:id/messages — user or admin retrieves message history
router.get('/', requireUserOrAdmin, messageController.getMessages);

export default router;
