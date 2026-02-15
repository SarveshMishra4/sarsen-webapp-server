/**
 * Questionnaire Service
 * 
 * Contains business logic for managing questionnaires:
 * - Creating and sending questionnaires
 * - Submitting responses
 * - Tracking deadlines and overdue status
 * - Updating engagement questionnaire counts
 */

import { Questionnaire, IQuestionnaire, QuestionnaireStatus } from '../models/Questionnaire.model';
import { Engagement } from '../models/Engagement.model';
import { User } from '../models/User.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface CreateQuestionnaireInput {
  engagementId: string;
  title: string;
  description?: string;
  instructions?: string;
  questions: {
    questionText: string;
    questionType: 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'date';
    options?: string[];
    required: boolean;
    order: number;
  }[];
  deadline?: Date;
}

export interface SubmitQuestionnaireInput {
  questionnaireId: string;
  userId: string;
  answers: {
    questionId: string;
    answer: any;
    fileUrl?: string;
  }[];
  timeSpent?: number;
}

/**
 * Create and send a new questionnaire
 * @param input - Questionnaire creation input
 * @param adminId - Admin creating the questionnaire
 * @returns Created questionnaire
 */
export const createQuestionnaire = async (
  input: CreateQuestionnaireInput,
  adminId: string
): Promise<IQuestionnaire> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { engagementId, title, description, instructions, questions, deadline } = input;
    
    // Verify engagement exists
    const engagement = await Engagement.findById(engagementId).session(session);
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    // Create questionnaire
    const [questionnaire] = await Questionnaire.create([{
      engagementId,
      createdBy: adminId,
      title,
      description,
      instructions,
      questions: questions.map(q => ({
        ...q,
        answer: undefined,
      })),
      deadline,
      status: 'pending',
      sentAt: new Date(),
      totalQuestions: questions.length,
      answeredQuestions: 0,
      reminderCount: 0,
    }], { session });
    
    // Increment questionnaire count on engagement
    engagement.questionnaireCount = (engagement.questionnaireCount || 0) + 1;
    await engagement.save({ session });
    
    await session.commitTransaction();
    
    logger.info(`Questionnaire created: ${questionnaire._id} for engagement ${engagementId}`);
    
    return questionnaire;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get questionnaires for an engagement
 * @param engagementId - Engagement ID
 * @param filters - Optional filters (status, etc.)
 * @returns Array of questionnaires
 */
export const getEngagementQuestionnaires = async (
  engagementId: string,
  filters: { status?: QuestionnaireStatus } = {}
): Promise<IQuestionnaire[]> => {
  try {
    const query: any = { engagementId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    return await Questionnaire.find(query)
      .sort({ sentAt: -1 })
      .populate('createdBy', 'email')
      .populate('submittedBy', 'email firstName lastName');
  } catch (error) {
    logger.error('Error fetching questionnaires:', error);
    throw new ApiError(500, 'Failed to fetch questionnaires');
  }
};

/**
 * Get questionnaire by ID
 * @param questionnaireId - Questionnaire ID
 * @returns Questionnaire with populated fields
 */
export const getQuestionnaireById = async (
  questionnaireId: string
): Promise<IQuestionnaire | null> => {
  try {
    return await Questionnaire.findById(questionnaireId)
      .populate('createdBy', 'email')
      .populate('submittedBy', 'email firstName lastName')
      .populate('engagementId', 'engagementId serviceName');
  } catch (error) {
    logger.error('Error fetching questionnaire:', error);
    throw new ApiError(500, 'Failed to fetch questionnaire');
  }
};

/**
 * Submit questionnaire responses
 * @param input - Submission input
 * @returns Updated questionnaire
 */
export const submitQuestionnaire = async (
  input: SubmitQuestionnaireInput
): Promise<IQuestionnaire> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { questionnaireId, userId, answers, timeSpent } = input;
    
    // Find questionnaire
    const questionnaire = await Questionnaire.findById(questionnaireId).session(session);
    
    if (!questionnaire) {
      throw new ApiError(404, 'Questionnaire not found');
    }
    
    // Check if already submitted
    if (questionnaire.status === 'submitted') {
      throw new ApiError(400, 'Questionnaire already submitted');
    }
    
    // Check if overdue
    if (questionnaire.deadline && new Date() > questionnaire.deadline) {
      questionnaire.status = 'overdue';
      await questionnaire.save({ session });
      throw new ApiError(400, 'Questionnaire deadline has passed');
    }
    
    // Map answers to questions
    const answerMap = new Map(answers.map(a => [a.questionId, a]));
    
    // Update each question with answer
    let answeredCount = 0;
    questionnaire.questions.forEach(question => {
      const answer = answerMap.get(question._id?.toString() || '');
      if (answer) {
        question.answer = answer.answer;
        question.fileUrl = answer.fileUrl;
        answeredCount++;
      } else if (question.required) {
        throw new ApiError(400, `Required question "${question.questionText}" is missing an answer`);
      }
    });
    
    // Update questionnaire status
    questionnaire.status = 'submitted';
    questionnaire.submittedAt = new Date();
    questionnaire.submittedBy = new mongoose.Types.ObjectId(userId);
    questionnaire.timeSpent = timeSpent;
    questionnaire.answeredQuestions = answeredCount;
    
    await questionnaire.save({ session });
    await session.commitTransaction();
    
    logger.info(`Questionnaire ${questionnaireId} submitted by user ${userId}`);
    
    return questionnaire;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Check and update overdue questionnaires
 * Called by cron job or manually
 */
export const updateOverdueStatus = async (): Promise<number> => {
  try {
    const result = await Questionnaire.updateMany(
      {
        status: 'pending',
        deadline: { $lt: new Date() },
      },
      {
        $set: { status: 'overdue' },
      }
    );
    
    logger.info(`Updated ${result.modifiedCount} questionnaires to overdue status`);
    
    return result.modifiedCount;
  } catch (error) {
    logger.error('Error updating overdue status:', error);
    throw new ApiError(500, 'Failed to update overdue status');
  }
};

/**
 * Send reminder for pending questionnaires
 * @param questionnaireId - Questionnaire ID
 * @returns Updated questionnaire
 */
export const sendReminder = async (
  questionnaireId: string
): Promise<IQuestionnaire> => {
  try {
    const questionnaire = await Questionnaire.findById(questionnaireId);
    
    if (!questionnaire) {
      throw new ApiError(404, 'Questionnaire not found');
    }
    
    if (questionnaire.status !== 'pending') {
      throw new ApiError(400, `Cannot send reminder for ${questionnaire.status} questionnaire`);
    }
    
    questionnaire.reminderSentAt = new Date();
    questionnaire.reminderCount = (questionnaire.reminderCount || 0) + 1;
    
    await questionnaire.save();
    
    // TODO: Send email notification
    
    logger.info(`Reminder sent for questionnaire ${questionnaireId}`);
    
    return questionnaire;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error sending reminder:', error);
    throw new ApiError(500, 'Failed to send reminder');
  }
};

/**
 * Cancel a questionnaire
 * @param questionnaireId - Questionnaire ID
 * @param adminId - Admin cancelling
 */
export const cancelQuestionnaire = async (
  questionnaireId: string,
  adminId: string
): Promise<IQuestionnaire> => {
  try {
    const questionnaire = await Questionnaire.findById(questionnaireId);
    
    if (!questionnaire) {
      throw new ApiError(404, 'Questionnaire not found');
    }
    
    if (questionnaire.status === 'submitted') {
      throw new ApiError(400, 'Cannot cancel a submitted questionnaire');
    }
    
    questionnaire.status = 'cancelled';
    await questionnaire.save();
    
    logger.info(`Questionnaire ${questionnaireId} cancelled by admin ${adminId}`);
    
    return questionnaire;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error cancelling questionnaire:', error);
    throw new ApiError(500, 'Failed to cancel questionnaire');
  }
};