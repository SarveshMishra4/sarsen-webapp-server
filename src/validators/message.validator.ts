/**
 * Message Validators
 * 
 * Validates incoming request data for messaging endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface SendMessageRequest {
  engagementId: string;
  content: string;
  attachments?: {
    type: string;
    url: string;
    name: string;
    size?: number;
  }[];
}

export interface MessageFilters {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

/**
 * Validate send message request
 * @param body - Request body
 * @returns Validated message data
 */
export const validateSendMessage = (body: any): SendMessageRequest => {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate engagementId
  // Validate engagementId
if (!body.engagementId) {
  errors.push('Engagement ID is required');
} else if (typeof body.engagementId !== 'string') {
  errors.push('Engagement ID must be a string');
}

  // Validate content
  if (!body.content) {
    errors.push('Message content is required');
  } else if (typeof body.content !== 'string') {
    errors.push('Message content must be a string');
  } else if (body.content.trim().length === 0) {
    errors.push('Message content cannot be empty');
  } else if (body.content.length > 5000) {
    errors.push('Message cannot exceed 5000 characters');
  }

  // Validate attachments if provided
  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments)) {
      errors.push('Attachments must be an array');
    } else {
      body.attachments.forEach((att: any, index: number) => {
        if (!att.type) {
          errors.push(`Attachment at index ${index} is missing type`);
        }
        if (!att.url) {
          errors.push(`Attachment at index ${index} is missing url`);
        }
        if (!att.name) {
          errors.push(`Attachment at index ${index} is missing name`);
        }
      });
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    engagementId: body.engagementId,
    content: body.content.trim(),
    attachments: body.attachments,
  };
};

/**
 * Validate message filters from query params
 * @param query - Request query params
 * @returns Validated filters
 */
export const validateMessageFilters = (query: any): MessageFilters => {
  const filters: MessageFilters = {};
  const errors: string[] = [];

  // Validate page
  if (query.page !== undefined) {
    const page = parseInt(query.page);
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive number');
    } else {
      filters.page = page;
    }
  }

  // Validate limit
  if (query.limit !== undefined) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      filters.limit = limit;
    }
  }

  // Validate before date
  if (query.before !== undefined) {
    const date = new Date(query.before);
    if (isNaN(date.getTime())) {
      errors.push('Invalid before date format');
    } else {
      filters.before = query.before;
    }
  }

  // Validate after date
  if (query.after !== undefined) {
    const date = new Date(query.after);
    if (isNaN(date.getTime())) {
      errors.push('Invalid after date format');
    } else {
      filters.after = query.after;
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return filters;
};