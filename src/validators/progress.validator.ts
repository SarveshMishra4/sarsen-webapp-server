/**
 * Progress Validators
 * 
 * Validates incoming request data for progress endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';
import { ALLOWED_MILESTONES } from '../constants/milestones';

export interface ProgressUpdateRequest {
  engagementId: string;
  progress: number;
  note?: string;
}

/**
 * Validate progress update request
 * @param body - Request body
 * @returns Validated progress update data
 */
export const validateProgressUpdate = (body: any): ProgressUpdateRequest => {
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

  // Validate progress
  if (body.progress === undefined) {
    errors.push('Progress value is required');
  } else if (typeof body.progress !== 'number') {
    errors.push('Progress must be a number');
  } else if (!ALLOWED_MILESTONES.includes(body.progress)) {
    errors.push(`Progress must be one of: ${ALLOWED_MILESTONES.join(', ')}`);
  }

  // Validate note (optional)
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
    engagementId: body.engagementId,
    progress: body.progress,
    note: body.note,
  };
};

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

/**
 * Validate stalled engagements query
 * @param query - Request query params
 * @returns Validated days threshold
 */
export const validateStalledQuery = (query: any): { days: number } => {
  let days = 7; // Default
  
  if (query.days !== undefined) {
    const parsed = parseInt(query.days);
    if (isNaN(parsed) || parsed < 1) {
      throw new ApiError(400, 'Days must be a positive number');
    }
    days = parsed;
  }
  
  return { days };
};