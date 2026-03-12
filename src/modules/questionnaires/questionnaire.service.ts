import mongoose from 'mongoose';
import {
  Questionnaire, IQuestionnaire,
  Question, IQuestion,
  Answer, IAnswer,
} from './questionnaire.model.js';
import { Engagement } from '../engagements/engagement.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { notificationService } from '../notifications/notification.service.js';

export const questionnaireService = {

  // ─── Admin Operations ─────────────────────────────────────────────────────

  /**
   * createQuestionnaire
   *
   * Admin creates a questionnaire for a specific engagement.
   * Blocked if the engagement is already delivered.
   */
  async createQuestionnaire(
    engagementId: string,
    adminId: string,
    data: { title: string; deadline: string }
  ): Promise<IQuestionnaire> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.status === 'delivered') {
      throw new AppError(
        'Cannot assign a questionnaire to a delivered engagement.',
        403
      );
    }

    const questionnaire = await Questionnaire.create({
      engagementId,
      title:    data.title,
      deadline: new Date(data.deadline),
    });

    logger.info('[Questionnaire] Created', {
      questionnaireId: questionnaire._id.toString(),
      engagementId,
      adminId,
    });

    // Notify user that a questionnaire has been assigned
    // Note: Intentionally not using 'await' to avoid blocking the response
    notificationService.createNotification({
      recipientId:   engagement.userId.toString(),
      recipientRole: 'user',
      type:          'questionnaire_assigned',
      message:       `A new questionnaire "${questionnaire.title}" has been assigned to you.`,
      engagementId:  engagementId,
    });

    return questionnaire;
  },

  /**
   * addQuestion
   *
   * Admin adds a question to an existing questionnaire.
   * Blocked if the questionnaire has already been submitted.
   */
  async addQuestion(
    questionnaireId: string,
    data: { text: string; order: number }
  ): Promise<IQuestion> {
    if (!mongoose.Types.ObjectId.isValid(questionnaireId)) {
      throw new AppError('Invalid questionnaire ID', 400);
    }

    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire) throw new AppError('Questionnaire not found', 404);

    if (questionnaire.isSubmitted) {
      throw new AppError('Cannot add questions to a submitted questionnaire.', 403);
    }

    const question = await Question.create({
      questionnaireId,
      text:  data.text,
      order: data.order,
    });

    logger.info('[Questionnaire] Question added', {
      questionnaireId,
      questionId: question._id.toString(),
    });

    return question;
  },

  // ─── User Operations ──────────────────────────────────────────────────────

  /**
   * getQuestionnairesForEngagement
   *
   * Returns all questionnaires for an engagement with their questions and answers.
   * User must own the engagement.
   */
  async getQuestionnairesForEngagement(
    engagementId: string,
    userId: string
  ): Promise<object[]> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.userId.toString() !== userId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    const questionnaires = await Questionnaire.find({ engagementId }).sort({ createdAt: 1 });

    // For each questionnaire, attach questions and any existing answers
    const results = await Promise.all(
      questionnaires.map(async (q) => {
        const questions = await Question.find({ questionnaireId: q._id }).sort({ order: 1 });
        const answers   = await Answer.find({ questionnaireId: q._id, userId });

        return {
          ...q.toJSON(),
          questions,
          answers,
        };
      })
    );

    return results;
  },

  /**
   * submitAnswers
   *
   * User submits answers for a questionnaire.
   * Validates:
   * - Questionnaire exists
   * - User owns the engagement
   * - Engagement is not delivered
   * - Questionnaire not already submitted (409)
   * - All provided questionIds belong to this questionnaire
   *
   * Locks the questionnaire on success — no further submissions.
   */
  async submitAnswers(
    questionnaireId: string,
    userId: string,
    answers: { questionId: string; answerText: string }[]
  ): Promise<{ questionnaire: IQuestionnaire; answers: IAnswer[] }> {
    if (!mongoose.Types.ObjectId.isValid(questionnaireId)) {
      throw new AppError('Invalid questionnaire ID', 400);
    }

    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire) throw new AppError('Questionnaire not found', 404);

    // Ownership check via engagement
    const engagement = await Engagement.findById(questionnaire.engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.userId.toString() !== userId) {
      throw new AppError('You do not have access to this questionnaire', 403);
    }

    if (engagement.status === 'delivered') {
      throw new AppError(
        'This engagement has been delivered. Questionnaire submission is no longer available.',
        403
      );
    }

    if (questionnaire.isSubmitted) {
      throw new AppError('This questionnaire has already been submitted.', 409);
    }

    // Validate all submitted questionIds belong to this questionnaire
    const validQuestions = await Question.find({ questionnaireId });
    const validIds = new Set(validQuestions.map((q) => q._id.toString()));

    for (const a of answers) {
      if (!validIds.has(a.questionId)) {
        throw new AppError(`Question ID ${a.questionId} does not belong to this questionnaire.`, 400);
      }
    }

    // Store all answers
    const savedAnswers = await Answer.insertMany(
      answers.map((a) => ({
        questionId:      new mongoose.Types.ObjectId(a.questionId),
        questionnaireId: questionnaire._id,
        engagementId:    questionnaire.engagementId,
        userId:          new mongoose.Types.ObjectId(userId),
        answerText:      a.answerText,
      }))
    );

    // Lock questionnaire
    questionnaire.isSubmitted = true;
    questionnaire.submittedAt = new Date();
    await questionnaire.save();

    logger.info('[Questionnaire] Submitted and locked', {
      questionnaireId,
      userId,
      answerCount: savedAnswers.length,
    });

    // Notify admin that questionnaire was submitted
    notificationService.createNotification({
      recipientId:   'admin-global',
      recipientRole: 'admin',
      type:          'questionnaire_submitted',
      message:       `A user has submitted answers to questionnaire "${questionnaire.title}".`,
      engagementId:  questionnaire.engagementId.toString(),
    });

    return { questionnaire, answers: savedAnswers as unknown as IAnswer[] };
  },

  // ─── Admin Read ───────────────────────────────────────────────────────────

  /**
   * getQuestionnairesForEngagementAdmin
   *
   * Admin version — no ownership check, full detail including all answers.
   */
  async getQuestionnairesForEngagementAdmin(engagementId: string): Promise<object[]> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    const questionnaires = await Questionnaire.find({ engagementId }).sort({ createdAt: 1 });

    return Promise.all(
      questionnaires.map(async (q) => {
        const questions = await Question.find({ questionnaireId: q._id }).sort({ order: 1 });
        const answers   = await Answer.find({ questionnaireId: q._id });
        return { ...q.toJSON(), questions, answers };
      })
    );
  },
};