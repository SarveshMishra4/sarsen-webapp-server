/**
 * Questionnaire Validators
 * 
 * Validates incoming request data for questionnaire endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface CreateQuestionnaireRequest {
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
  deadline?: string;
}

export interface SubmitQuestionnaireRequest {
  answers: {
    questionId: string;
    answer: any;
    fileUrl?: string;
  }[];
  timeSpent?: number;
}

/**
 * Validate create questionnaire request
 * @param body - Request body
 * @returns Validated questionnaire data
 */
export const validateCreateQuestionnaire = (body: any): CreateQuestionnaireRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate engagementId
  if (!body.engagementId) {
    errors.push('Engagement ID is required');
  } else if (typeof body.engagementId !== 'string') {
    errors.push('Engagement ID must be a string');
  } else if (!mongoose.Types.ObjectId.isValid(body.engagementId)) {
    errors.push('Invalid engagement ID format');
  }

  // Validate title
  if (!body.title) {
    errors.push('Title is required');
  } else if (typeof body.title !== 'string') {
    errors.push('Title must be a string');
  } else if (body.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  } else if (body.title.length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  // Validate description (optional)
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      errors.push('Description must be a string');
    } else if (body.description.length > 1000) {
      errors.push('Description cannot exceed 1000 characters');
    }
  }

  // Validate instructions (optional)
  if (body.instructions !== undefined && typeof body.instructions !== 'string') {
    errors.push('Instructions must be a string');
  }

  // Validate questions
  if (!body.questions || !Array.isArray(body.questions)) {
    errors.push('Questions must be an array');
  } else if (body.questions.length === 0) {
    errors.push('At least one question is required');
  } else {
    body.questions.forEach((q: any, index: number) => {
      if (!q.questionText) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }
      if (!q.questionType) {
        errors.push(`Question ${index + 1}: Question type is required`);
      } else if (!['text', 'textarea', 'select', 'multiselect', 'file', 'date'].includes(q.questionType)) {
        errors.push(`Question ${index + 1}: Invalid question type`);
      }
      if (q.questionType === 'select' || q.questionType === 'multiselect') {
        if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
          errors.push(`Question ${index + 1}: Options are required for select/multiselect questions`);
        }
      }
      if (q.order !== undefined && typeof q.order !== 'number') {
        errors.push(`Question ${index + 1}: Order must be a number`);
      }
    });
  }

  // Validate deadline (optional)
  if (body.deadline !== undefined) {
    const date = new Date(body.deadline);
    if (isNaN(date.getTime())) {
      errors.push('Invalid deadline date format');
    } else if (date < new Date()) {
      errors.push('Deadline cannot be in the past');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    engagementId: body.engagementId,
    title: body.title.trim(),
    description: body.description?.trim(),
    instructions: body.instructions?.trim(),
    questions: body.questions.map((q: any, index: number) => ({
      ...q,
      order: q.order !== undefined ? q.order : index,
    })),
    deadline: body.deadline,
  };
};

/**
 * Validate submit questionnaire request
 * @param body - Request body
 * @returns Validated submission data
 */
export const validateSubmitQuestionnaire = (body: any): SubmitQuestionnaireRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate answers
  if (!body.answers || !Array.isArray(body.answers)) {
    errors.push('Answers must be an array');
  } else {
    body.answers.forEach((a: any, index: number) => {
      if (!a.questionId) {
        errors.push(`Answer ${index + 1}: Question ID is required`);
      } else if (typeof a.questionId !== 'string') {
        errors.push(`Answer ${index + 1}: Question ID must be a string`);
      }
      
      if (a.answer === undefined) {
        errors.push(`Answer ${index + 1}: Answer value is required`);
      }
    });
  }

  // Validate timeSpent (optional)
  if (body.timeSpent !== undefined) {
    if (typeof body.timeSpent !== 'number') {
      errors.push('Time spent must be a number');
    } else if (body.timeSpent < 0) {
      errors.push('Time spent cannot be negative');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    answers: body.answers,
    timeSpent: body.timeSpent,
  };
};

/**
 * Validate questionnaire ID parameter
 * @param questionnaireId - Questionnaire ID from URL params
 */
export const validateQuestionnaireId = (questionnaireId: string): void => {
  if (!questionnaireId) {
    throw new ApiError(400, 'Questionnaire ID is required');
  }
  
  if (typeof questionnaireId !== 'string') {
    throw new ApiError(400, 'Questionnaire ID must be a string');
  }
  
  if (!mongoose.Types.ObjectId.isValid(questionnaireId)) {
    throw new ApiError(400, 'Invalid questionnaire ID format');
  }
};