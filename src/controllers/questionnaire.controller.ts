/**
 * Questionnaire Controller
 * 
 * Handles HTTP requests for questionnaire management:
 * - Creating and sending questionnaires
 * - Fetching questionnaires
 * - Submitting responses
 * - Managing questionnaire status
 */

import { Request, Response, NextFunction } from 'express';
import * as questionnaireService from '../services/questionnaire.service';
import { 
  validateCreateQuestionnaire, 
  validateSubmitQuestionnaire,
  validateQuestionnaireId 
} from '../validators/questionnaire.validator';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';
import { IQuestion } from '../models/Questionnaire.model'; // Import for type safety

/**
 * Create and send a new questionnaire
 * POST /api/admin/questionnaires
 * Access: Admin only
 */
export const createQuestionnaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const questionnaireData = validateCreateQuestionnaire(req.body);
    
    // FIXED: Convert deadline string to Date object if provided
    const serviceInput = {
      ...questionnaireData,
      deadline: questionnaireData.deadline ? new Date(questionnaireData.deadline) : undefined,
    };
    
    const questionnaire = await questionnaireService.createQuestionnaire(
      serviceInput,
      req.admin.id
    );
    
    res.status(201).json({
      success: true,
      message: 'Questionnaire created and sent successfully',
      data: { questionnaire },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get questionnaires for an engagement
 * GET /api/admin/engagements/:engagementId/questionnaires
 * Access: Admin only
 */
export const getEngagementQuestionnaires = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { engagementId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new ApiError(400, 'Invalid engagement ID format');
    }
    
    const { status } = req.query;
    const filters = status ? { status: status as any } : {};
    
    const questionnaires = await questionnaireService.getEngagementQuestionnaires(
      engagementId,
      filters
    );
    
    res.status(200).json({
      success: true,
      data: { questionnaires },
      count: questionnaires.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get client's questionnaires
 * GET /api/client/questionnaires
 * Access: Client only
 */
export const getMyQuestionnaires = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    // If client is scoped to an engagement, get that engagement's questionnaires
    if (!req.client.engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const questionnaires = await questionnaireService.getEngagementQuestionnaires(
      req.client.engagementId,
      { status: 'pending' } // Only show pending questionnaires to client
    );
    
    res.status(200).json({
      success: true,
      data: { questionnaires },
      count: questionnaires.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get questionnaire by ID (admin)
 * GET /api/admin/questionnaires/:questionnaireId
 * Access: Admin only
 */
export const getQuestionnaireById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { questionnaireId } = req.params;
    validateQuestionnaireId(questionnaireId);
    
    const questionnaire = await questionnaireService.getQuestionnaireById(questionnaireId);
    
    if (!questionnaire) {
      throw new ApiError(404, 'Questionnaire not found');
    }
    
    res.status(200).json({
      success: true,
      data: { questionnaire },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get questionnaire for client to fill
 * GET /api/client/questionnaires/:questionnaireId
 * Access: Client only
 */
export const getClientQuestionnaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    const { questionnaireId } = req.params;
    validateQuestionnaireId(questionnaireId);
    
    const questionnaire = await questionnaireService.getQuestionnaireById(questionnaireId);
    
    if (!questionnaire) {
      throw new ApiError(404, 'Questionnaire not found');
    }
    
    // Verify client has access to this engagement
    if (questionnaire.engagementId.toString() !== req.client.engagementId) {
      throw new ApiError(403, 'You do not have access to this questionnaire');
    }
    
    // Remove answer data for pending questionnaires (client shouldn't see previous answers)
    if (questionnaire.status === 'pending') {
      const questionnaireObj = questionnaire.toObject();
      
      // FIXED: Explicitly type the question parameter
      questionnaireObj.questions = questionnaireObj.questions.map((q: IQuestion) => {
        const { answer, ...rest } = q;
        return rest;
      });
      
      res.status(200).json({
        success: true,
        data: { questionnaire: questionnaireObj },
      });
    } else {
      res.status(200).json({
        success: true,
        data: { questionnaire },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Submit questionnaire responses
 * POST /api/client/questionnaires/:questionnaireId/submit
 * Access: Client only
 */
export const submitQuestionnaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    const { questionnaireId } = req.params;
    validateQuestionnaireId(questionnaireId);
    
    const submissionData = validateSubmitQuestionnaire(req.body);
    
    // Verify questionnaire belongs to client's engagement
    const questionnaire = await questionnaireService.getQuestionnaireById(questionnaireId);
    if (!questionnaire) {
      throw new ApiError(404, 'Questionnaire not found');
    }
    
    if (questionnaire.engagementId.toString() !== req.client.engagementId) {
      throw new ApiError(403, 'You do not have access to this questionnaire');
    }
    
    const updated = await questionnaireService.submitQuestionnaire({
      questionnaireId,
      userId: req.client.id,
      answers: submissionData.answers,
      timeSpent: submissionData.timeSpent,
    });
    
    res.status(200).json({
      success: true,
      message: 'Questionnaire submitted successfully',
      data: { questionnaire: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send reminder for questionnaire
 * POST /api/admin/questionnaires/:questionnaireId/remind
 * Access: Admin only
 */
export const sendReminder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { questionnaireId } = req.params;
    validateQuestionnaireId(questionnaireId);
    
    const questionnaire = await questionnaireService.sendReminder(questionnaireId);
    
    res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
      data: { questionnaire },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a questionnaire
 * DELETE /api/admin/questionnaires/:questionnaireId
 * Access: Admin only
 */
export const cancelQuestionnaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { questionnaireId } = req.params;
    validateQuestionnaireId(questionnaireId);
    
    const questionnaire = await questionnaireService.cancelQuestionnaire(
      questionnaireId,
      req.admin.id
    );
    
    res.status(200).json({
      success: true,
      message: 'Questionnaire cancelled successfully',
      data: { questionnaire },
    });
  } catch (error) {
    next(error);
  }
};