/**
 * Client Authentication Validators
 * 
 * Validates incoming request data for client auth endpoints.
 */

import { ApiError } from '../middleware/error.middleware';

export interface ClientLoginRequest {
  email: string;
  password: string;
  engagementId?: string;
}

/**
 * Validate client login request body
 * @param body - Request body
 * @returns Validated login data
 */
export const validateClientLogin = (body: any): ClientLoginRequest => {
  const errors: string[] = [];

  // Check if body exists
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  // Validate email
  if (!body.email) {
    errors.push('Email is required');
  } else if (typeof body.email !== 'string') {
    errors.push('Email must be a string');
  } else {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(body.email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Validate password
  if (!body.password) {
    errors.push('Password is required');
  } else if (typeof body.password !== 'string') {
    errors.push('Password must be a string');
  } else if (body.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Validate engagementId if provided (must be a valid MongoDB ObjectId)
  if (body.engagementId !== undefined && body.engagementId !== null) {
    if (typeof body.engagementId !== 'string') {
      errors.push('Engagement ID must be a string');
    } else {
      // Check if it's a valid MongoDB ObjectId (24 hex characters)
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(body.engagementId)) {
        errors.push('Invalid engagement ID format');
      }
    }
  }

  // If any errors, throw
  if (errors.length > 0) {
    throw new ApiError(400, errors.join('. '));
  }

  return {
    email: body.email.toLowerCase().trim(),
    password: body.password,
    engagementId: body.engagementId,
  };
};

/**
 * Validate refresh token request
 * @param body - Request body
 * @returns Validated refresh token
 */
export const validateRefreshToken = (body: any): { refreshToken: string } => {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  if (!body.refreshToken) {
    throw new ApiError(400, 'Refresh token is required');
  }

  if (typeof body.refreshToken !== 'string') {
    throw new ApiError(400, 'Refresh token must be a string');
  }

  return { refreshToken: body.refreshToken };
};