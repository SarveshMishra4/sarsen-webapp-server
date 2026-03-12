import { Request, Response, NextFunction } from 'express';
import { questionnaireService } from './questionnaire.service.js';
import {
  createQuestionnaireSchema,
  addQuestionSchema,
  submitAnswersSchema,
} from './questionnaire.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const questionnaireController = {

  // ─── Admin Handlers ───────────────────────────────────────────────────────

  /**
   * POST /engagements/:id/questionnaires/admin
   * Admin creates a questionnaire for the engagement.
   */
  async createQuestionnaire(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createQuestionnaireSchema.safeParse(req.body);
      if (!parsed.success) {
        // Safe access with optional chaining and a fallback string
        throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400);
      }

      const questionnaire = await questionnaireService.createQuestionnaire(
        req.params.id as string,
        req.adminId!,
        parsed.data
      );

      res.status(201).json(
        formatResponse(true, 'Questionnaire created successfully.', questionnaire)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /questionnaires/:id/questions/admin
   * Admin adds a question to an existing questionnaire.
   * Note: this route uses :id as questionnaireId, not engagementId.
   */
  async addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = addQuestionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400);
      }

      const question = await questionnaireService.addQuestion(
        req.params.id as string,
        parsed.data
      );

      res.status(201).json(
        formatResponse(true, 'Question added successfully.', question)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/:id/questionnaires/admin
   * Admin views all questionnaires for an engagement with questions and answers.
   */
  async getQuestionnairesAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questionnaires = await questionnaireService.getQuestionnairesForEngagementAdmin(
        req.params.id as string
      );

      res.status(200).json(
        formatResponse(true, 'Questionnaires retrieved.', {
          questionnaires,
          total: questionnaires.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  // ─── User Handlers ────────────────────────────────────────────────────────

  /**
   * GET /engagements/:id/questionnaires
   * User views their questionnaires for this engagement (with questions and their own answers).
   */
  async getQuestionnaires(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const questionnaires = await questionnaireService.getQuestionnairesForEngagement(
        req.params.id as string,
        req.userId!
      );

      res.status(200).json(
        formatResponse(true, 'Questionnaires retrieved.', {
          questionnaires,
          total: questionnaires.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /questionnaires/:id/submit
   * User submits answers. Locks the questionnaire on success.
   * :id here is the questionnaireId.
   */
  async submitAnswers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitAnswersSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Validation failed', 400);
      }

      const result = await questionnaireService.submitAnswers(
        req.params.id as string,
        req.userId!,
        parsed.data.answers
      );

      res.status(200).json(
        formatResponse(true, 'Questionnaire submitted successfully.', result)
      );
    } catch (err) {
      next(err);
    }
  },
};