/**
 * Questionnaire Routes
 * 
 * Defines all questionnaire-related endpoints.
 */

import { Router } from 'express';
import * as questionnaireController from '../controllers/questionnaire.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { clientAuthMiddleware } from '../middleware/clientAuth.middleware';

const router = Router();

/**
 * Admin routes
 */

// @route   POST /api/admin/questionnaires
// @desc    Create and send a new questionnaire
// @access  Admin only
router.post(
  '/admin/questionnaires',
  adminAuthMiddleware,
  questionnaireController.createQuestionnaire
);

// @route   GET /api/admin/engagements/:engagementId/questionnaires
// @desc    Get questionnaires for an engagement
// @access  Admin only
router.get(
  '/admin/engagements/:engagementId/questionnaires',
  adminAuthMiddleware,
  questionnaireController.getEngagementQuestionnaires
);

// @route   GET /api/admin/questionnaires/:questionnaireId
// @desc    Get questionnaire by ID
// @access  Admin only
router.get(
  '/admin/questionnaires/:questionnaireId',
  adminAuthMiddleware,
  questionnaireController.getQuestionnaireById
);

// @route   POST /api/admin/questionnaires/:questionnaireId/remind
// @desc    Send reminder for questionnaire
// @access  Admin only
router.post(
  '/admin/questionnaires/:questionnaireId/remind',
  adminAuthMiddleware,
  questionnaireController.sendReminder
);

// @route   DELETE /api/admin/questionnaires/:questionnaireId
// @desc    Cancel a questionnaire
// @access  Admin only
router.delete(
  '/admin/questionnaires/:questionnaireId',
  adminAuthMiddleware,
  questionnaireController.cancelQuestionnaire
);

/**
 * Client routes
 */

// @route   GET /api/client/questionnaires
// @desc    Get client's pending questionnaires
// @access  Client only
router.get(
  '/client/questionnaires',
  clientAuthMiddleware,
  questionnaireController.getMyQuestionnaires
);

// @route   GET /api/client/questionnaires/:questionnaireId
// @desc    Get questionnaire for client to fill
// @access  Client only
router.get(
  '/client/questionnaires/:questionnaireId',
  clientAuthMiddleware,
  questionnaireController.getClientQuestionnaire
);

// @route   POST /api/client/questionnaires/:questionnaireId/submit
// @desc    Submit questionnaire responses
// @access  Client only
router.post(
  '/client/questionnaires/:questionnaireId/submit',
  clientAuthMiddleware,
  questionnaireController.submitQuestionnaire
);

export default router;