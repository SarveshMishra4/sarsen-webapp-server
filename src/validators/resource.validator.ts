/**
 * Resource Validators
 * 
 * Validates incoming request data for resource endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface ShareResourceRequest {
  engagementId: string;
  type: 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image' | 'other';
  title: string;
  description?: string;
  url?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  icon?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

export interface ResourceFilters {
  type?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Validate share resource request
 * @param body - Request body
 * @returns Validated resource data
 */
export const validateShareResource = (body: any): ShareResourceRequest => {
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

  // Validate type
  if (!body.type) {
    errors.push('Resource type is required');
  } else if (!['pdf', 'doc', 'excel', 'ppt', 'link', 'video', 'image', 'other'].includes(body.type)) {
    errors.push('Invalid resource type');
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

  // Validate URL (required for link type, optional for others)
  if (body.type === 'link' && !body.url) {
    errors.push('URL is required for link resources');
  }
  
  if (body.url !== undefined && typeof body.url !== 'string') {
    errors.push('URL must be a string');
  }

  // Validate file fields (for non-link resources)
  if (body.type !== 'link') {
    if (!body.fileKey && !body.url) {
      errors.push('Either fileKey or URL is required');
    }
    
    if (body.fileKey && typeof body.fileKey !== 'string') {
      errors.push('File key must be a string');
    }
    
    if (body.fileName && typeof body.fileName !== 'string') {
      errors.push('File name must be a string');
    }
    
    if (body.fileSize !== undefined) {
      if (typeof body.fileSize !== 'number') {
        errors.push('File size must be a number');
      } else if (body.fileSize < 0) {
        errors.push('File size cannot be negative');
      }
    }
    
    if (body.mimeType && typeof body.mimeType !== 'string') {
      errors.push('MIME type must be a string');
    }
  }

  // Validate icon (optional)
  if (body.icon !== undefined && typeof body.icon !== 'string') {
    errors.push('Icon must be a string');
  }

  // Validate thumbnailUrl (optional)
  if (body.thumbnailUrl !== undefined && typeof body.thumbnailUrl !== 'string') {
    errors.push('Thumbnail URL must be a string');
  }

  // Validate isPublic (optional)
  if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean');
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    engagementId: body.engagementId,
    type: body.type,
    title: body.title.trim(),
    description: body.description?.trim(),
    url: body.url?.trim(),
    fileKey: body.fileKey?.trim(),
    fileName: body.fileName?.trim(),
    fileSize: body.fileSize,
    mimeType: body.mimeType?.trim(),
    icon: body.icon?.trim(),
    thumbnailUrl: body.thumbnailUrl?.trim(),
    isPublic: body.isPublic,
  };
};

/**
 * Validate resource ID parameter
 * @param resourceId - Resource ID from URL params
 */
export const validateResourceId = (resourceId: string): void => {
  if (!resourceId) {
    throw new ApiError(400, 'Resource ID is required');
  }
  
  if (typeof resourceId !== 'string') {
    throw new ApiError(400, 'Resource ID must be a string');
  }
  
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new ApiError(400, 'Invalid resource ID format');
  }
};

/**
 * Validate resource filters from query params
 * @param query - Request query params
 * @returns Validated filters
 */
export const validateResourceFilters = (query: any): ResourceFilters => {
  const filters: ResourceFilters = {};
  const errors: string[] = [];

  // Validate type
  if (query.type !== undefined) {
    if (typeof query.type !== 'string') {
      errors.push('Type must be a string');
    } else if (!['pdf', 'doc', 'excel', 'ppt', 'link', 'video', 'image', 'other'].includes(query.type)) {
      errors.push('Invalid resource type');
    } else {
      filters.type = query.type;
    }
  }

  // Validate isActive
  if (query.isActive !== undefined) {
    if (query.isActive === 'true') {
      filters.isActive = true;
    } else if (query.isActive === 'false') {
      filters.isActive = false;
    } else {
      errors.push('isActive must be "true" or "false"');
    }
  }

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

  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return filters;
};