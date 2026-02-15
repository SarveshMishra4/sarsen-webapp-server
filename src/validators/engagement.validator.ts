/**
 * Engagement Validators
 * 
 * Validates incoming request data for engagement endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import { ALLOWED_MILESTONES } from '../constants/milestones';
import mongoose from 'mongoose';

/**
 * Validate engagement ID parameter
 * @param engagementId - Engagement ID from URL params
 */
export const validateEngagementId = (engagementId: string): void => {
  if (!engagementId) {
    throw new ApiError(400, 'Engagement ID is required');
  }
  
  if (typeof engagementId !== 'string') {
    throw new ApiError(400, 'Engagement ID must be a string');
  }
  
  // Check if it's either a valid MongoDB ObjectId or matches our custom format
  const isObjectId = mongoose.Types.ObjectId.isValid(engagementId);
  const isCustomFormat = /^ENG-\d{4}-\d{5}$/.test(engagementId);
  
  if (!isObjectId && !isCustomFormat) {
    throw new ApiError(400, 'Invalid engagement ID format');
  }
};

export interface ProgressUpdateRequest {
  progress: number;
  note?: string;
}

/**
 * Validate progress update request
 * @param body - Request body
 * @returns Validated progress data
 */
export const validateProgressUpdate = (body: any): ProgressUpdateRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate progress
  if (body.progress === undefined) {
    errors.push('Progress value is required');
  } else if (typeof body.progress !== 'number') {
    errors.push('Progress must be a number');
  } else if (!ALLOWED_MILESTONES.includes(body.progress)) {
    errors.push(`Progress must be one of: ${ALLOWED_MILESTONES.join(', ')}`);
  }

  // Validate note if provided
  if (body.note !== undefined) {
    if (typeof body.note !== 'string') {
      errors.push('Note must be a string');
    } else if (body.note.length > 500) {
      errors.push('Note cannot exceed 500 characters');
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    progress: body.progress,
    note: body.note,
  };
};