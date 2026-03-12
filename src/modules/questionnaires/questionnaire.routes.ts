import { Router } from 'express';
import { questionnaireController } from './questionnaire.controller.js';
import { requireUser } from '../../core/middleware/requireUser.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

/**
 * Two routers are exported:
 *
 * 1. engagementQuestionnaireRouter (mergeParams: true)
 *    Nested under /engagements/:id/questionnaires
 *    Handles create (admin) and list (user + admin)
 *
 * 2. questionnaireRouter
 *    Mounted at /questionnaires
 *    Handles: add questions (admin) and submit answers (user)
 *    These actions operate on a questionnaireId, not an engagementId.
 */

// ─── Nested under /engagements/:id/questionnaires ────────────────────────────

export const engagementQuestionnaireRouter = Router({ mergeParams: true });

// POST /engagements/:id/questionnaires/admin — admin creates a questionnaire
engagementQuestionnaireRouter.post(
  '/admin',
  requireAdmin,
  questionnaireController.createQuestionnaire
);

// GET /engagements/:id/questionnaires — user views their questionnaires
engagementQuestionnaireRouter.get(
  '/',
  requireUser,
  questionnaireController.getQuestionnaires
);

// GET /engagements/:id/questionnaires/admin — admin views all questionnaires with answers
engagementQuestionnaireRouter.get(
  '/admin',
  requireAdmin,
  questionnaireController.getQuestionnairesAdmin
);

// ─── Standalone /questionnaires routes ───────────────────────────────────────

export const questionnaireRouter = Router();

// POST /questionnaires/:id/questions/admin — admin adds a question to a questionnaire
questionnaireRouter.post(
  '/:id/questions/admin',
  requireAdmin,
  questionnaireController.addQuestion
);

// POST /questionnaires/:id/submit — user submits answers, locks questionnaire
questionnaireRouter.post(
  '/:id/submit',
  requireUser,
  questionnaireController.submitAnswers
);
