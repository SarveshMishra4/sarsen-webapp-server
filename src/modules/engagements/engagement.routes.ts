import { Router, Request, Response, NextFunction } from 'express';
import { engagementController } from './engagement.controller.js';
import { checklistController } from '../checklists/checklist.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';
import messageRoutes from '../messages/message.routes.js';
import fileRoutes from '../files/fileReference.routes.js';
import { engagementQuestionnaireRouter } from '../questionnaires/questionnaire.routes.js';

const router = Router();

// Combined auth helper — used for read endpoints accessible by both roles
const requireUserOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireUser(req, res, (userErr?: any) => {
    if (!userErr) return next();
    requireAdmin(req, res, (adminErr?: any) => {
      if (!adminErr) return next();
      next(userErr);
    });
  });
};

// ─── User Routes ──────────────────────────────────────────────────────────────

// GET /engagements — user sees their own engagements only
router.get('/', requireUser, engagementController.getUserEngagements);

// GET /engagements/:id — user sees one of their engagements (403 if not theirs)
router.get('/:id', requireUser, engagementController.getUserEngagementById);

// GET /engagements/:id/purchase-answers — user reads own purchase questionnaire answers
router.get('/:id/purchase-answers', requireUser, engagementController.getPurchaseAnswers);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /engagements/admin — admin sees all engagements across all users
router.get('/admin', requireAdmin, engagementController.getAllEngagements);

// GET /engagements/admin/:id — admin sees any single engagement in full detail
router.get('/admin/:id', requireAdmin, engagementController.getEngagementByIdAdmin);

// GET /engagements/admin/:id/purchase-answers — admin reads purchase answers for any engagement
router.get('/admin/:id/purchase-answers', requireAdmin, engagementController.getPurchaseAnswersAdmin);

// ─── Checklist Routes (Admin) ─────────────────────────────────────────────────

// PATCH /engagements/admin/:id/checklist/:stepId — admin toggles a step complete/incomplete
router.patch('/admin/:id/checklist/:stepId', requireAdmin, checklistController.toggleStep);

// PUT /engagements/admin/:id/checklist — admin replaces entire checklist structure
router.put('/admin/:id/checklist', requireAdmin, checklistController.updateChecklist);

// PATCH /engagements/admin/:id/deliver — admin delivers engagement (requires 100% progress)
router.patch('/admin/:id/deliver', requireAdmin, checklistController.deliverEngagement);

// ─── Checklist Routes (User + Admin Read) ─────────────────────────────────────

// GET /engagements/:id/checklist — user or admin reads checklist and progress
router.get('/:id/checklist', requireUserOrAdmin, checklistController.getChecklist);

// ─── Nested Routes ────────────────────────────────────────────────────────────

// POST /engagements/:id/messages — user or admin sends a message
// GET  /engagements/:id/messages — user or admin retrieves message history
router.use('/:id/messages', messageRoutes);

// POST /engagements/:id/files/admin — admin attaches a file reference
// GET  /engagements/:id/files — user or admin retrieves file references
router.use('/:id/files', fileRoutes);

// POST /engagements/:id/questionnaires/admin — admin creates questionnaire
// GET  /engagements/:id/questionnaires — user views questionnaires
// GET  /engagements/:id/questionnaires/admin — admin views questionnaires with answers
router.use('/:id/questionnaires', engagementQuestionnaireRouter);

export default router;