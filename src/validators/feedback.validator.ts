/**
 * Feedback Validators
 * 
 * Validates incoming request data for feedback endpoints.
 */

import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface SubmitFeedbackRequest {
  engagementId: string;
  rating: number;
  review?: string;
  wouldRecommend: boolean;
  wouldUseAgain: boolean;
  communication?: number;
  quality?: number;
  timeliness?: number;
  value?: number;
  whatWorkedWell?: string[];
  whatCouldBeImproved?: string[];
  additionalComments?: string;
  allowTestimonial?: boolean;
  testimonial?: string;
  timeSpent?: number;
}

export interface FeedbackFilters {
  rating?: number;
  startDate?: string;
  endDate?: string;
  isHighlighted?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Validate submit feedback request
 * @param body - Request body
 * @returns Validated feedback data
 */
export const validateSubmitFeedback = (body: any): SubmitFeedbackRequest => {
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

  // Validate rating
  if (body.rating === undefined) {
    errors.push('Rating is required');
  } else if (typeof body.rating !== 'number') {
    errors.push('Rating must be a number');
  } else if (![1, 2, 3, 4, 5].includes(body.rating)) {
    errors.push('Rating must be between 1 and 5');
  }

  // Validate review (optional)
  if (body.review !== undefined) {
    if (typeof body.review !== 'string') {
      errors.push('Review must be a string');
    } else if (body.review.length > 2000) {
      errors.push('Review cannot exceed 2000 characters');
    }
  }

  // Validate wouldRecommend
  if (body.wouldRecommend === undefined) {
    errors.push('Would recommend is required');
  } else if (typeof body.wouldRecommend !== 'boolean') {
    errors.push('Would recommend must be a boolean');
  }

  // Validate wouldUseAgain
  if (body.wouldUseAgain === undefined) {
    errors.push('Would use again is required');
  } else if (typeof body.wouldUseAgain !== 'boolean') {
    errors.push('Would use again must be a boolean');
  }

  // Validate category ratings (optional)
  const categoryRatings = ['communication', 'quality', 'timeliness', 'value'];
  categoryRatings.forEach(field => {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'number') {
        errors.push(`${field} must be a number`);
      } else if (![1, 2, 3, 4, 5].includes(body[field])) {
        errors.push(`${field} must be between 1 and 5`);
      }
    }
  });

  // Validate whatWorkedWell (optional)
  if (body.whatWorkedWell !== undefined) {
    if (!Array.isArray(body.whatWorkedWell)) {
      errors.push('What worked well must be an array');
    } else {
      body.whatWorkedWell.forEach((item: any, index: number) => {
        if (typeof item !== 'string') {
          errors.push(`What worked well item ${index + 1} must be a string`);
        }
      });
    }
  }

  // Validate whatCouldBeImproved (optional)
  if (body.whatCouldBeImproved !== undefined) {
    if (!Array.isArray(body.whatCouldBeImproved)) {
      errors.push('What could be improved must be an array');
    } else {
      body.whatCouldBeImproved.forEach((item: any, index: number) => {
        if (typeof item !== 'string') {
          errors.push(`What could be improved item ${index + 1} must be a string`);
        }
      });
    }
  }

  // Validate additionalComments (optional)
  if (body.additionalComments !== undefined) {
    if (typeof body.additionalComments !== 'string') {
      errors.push('Additional comments must be a string');
    } else if (body.additionalComments.length > 1000) {
      errors.push('Additional comments cannot exceed 1000 characters');
    }
  }

  // Validate allowTestimonial (optional)
  if (body.allowTestimonial !== undefined && typeof body.allowTestimonial !== 'boolean') {
    errors.push('Allow testimonial must be a boolean');
  }

  // Validate testimonial (optional)
  if (body.testimonial !== undefined) {
    if (typeof body.testimonial !== 'string') {
      errors.push('Testimonial must be a string');
    } else if (body.testimonial.length > 500) {
      errors.push('Testimonial cannot exceed 500 characters');
    }
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
    engagementId: body.engagementId,
    rating: body.rating,
    review: body.review,
    wouldRecommend: body.wouldRecommend,
    wouldUseAgain: body.wouldUseAgain,
    communication: body.communication,
    quality: body.quality,
    timeliness: body.timeliness,
    value: body.value,
    whatWorkedWell: body.whatWorkedWell,
    whatCouldBeImproved: body.whatCouldBeImproved,
    additionalComments: body.additionalComments,
    allowTestimonial: body.allowTestimonial,
    testimonial: body.testimonial,
    timeSpent: body.timeSpent,
  };
};

/**
 * Validate feedback ID parameter
 * @param feedbackId - Feedback ID from URL params
 */
export const validateFeedbackId = (feedbackId: string): void => {
  if (!feedbackId) {
    throw new ApiError(400, 'Feedback ID is required');
  }
  
  if (typeof feedbackId !== 'string') {
    throw new ApiError(400, 'Feedback ID must be a string');
  }
  
  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, 'Invalid feedback ID format');
  }
};

/**
 * Validate feedback filters from query params
 * @param query - Request query params
 * @returns Validated filters
 */
export const validateFeedbackFilters = (query: any): FeedbackFilters => {
  const filters: FeedbackFilters = {};
  const errors: string[] = [];

  // Validate rating
  if (query.rating !== undefined) {
    const rating = parseInt(query.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      errors.push('Rating must be between 1 and 5');
    } else {
      filters.rating = rating;
    }
  }

  // Validate startDate
  if (query.startDate !== undefined) {
    const date = new Date(query.startDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid start date format');
    } else {
      filters.startDate = query.startDate;
    }
  }

  // Validate endDate
  if (query.endDate !== undefined) {
    const date = new Date(query.endDate);
    if (isNaN(date.getTime())) {
      errors.push('Invalid end date format');
    } else {
      filters.endDate = query.endDate;
    }
  }

  // Validate isHighlighted
  if (query.isHighlighted !== undefined) {
    if (query.isHighlighted === 'true') {
      filters.isHighlighted = true;
    } else if (query.isHighlighted === 'false') {
      filters.isHighlighted = false;
    } else {
      errors.push('isHighlighted must be "true" or "false"');
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