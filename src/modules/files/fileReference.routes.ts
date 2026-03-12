import { Router, Request, Response, NextFunction } from 'express';
import { fileReferenceController } from './fileReference.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

/**
 * File routes are nested under /engagements/:id/files
 * with mergeParams: true so req.params.id (engagementId) is available.
 */

const router = Router({ mergeParams: true });

// Combined auth — accepts user or admin token
const requireUserOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireUser(req, res, (userErr?: any) => {
    if (!userErr) return next();
    requireAdmin(req, res, (adminErr?: any) => {
      if (!adminErr) return next();
      next(userErr);
    });
  });
};

// POST /engagements/:id/files/admin — admin attaches a file reference
router.post('/admin', requireAdmin, fileReferenceController.attachFile);

// GET /engagements/:id/files — user or admin retrieves all file references
router.get('/', requireUserOrAdmin, fileReferenceController.getFiles);

export default router;
