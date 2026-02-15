/**
 * Feedback Controller
 * 
 * Handles HTTP requests for feedback management:
 * - Submitting feedback
 * - Retrieving feedback
 * - Feedback analytics
 */

import { Request, Response, NextFunction } from 'express';
import * as feedbackService from '../services/feedback.service';
import * as completionService from '../services/completion.service';
import { validateSubmitFeedback, validateFeedbackId, validateFeedbackFilters } from '../validators/feedback.validator';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';
import { Feedback as FeedbackModel } from '../models/Feedback.model';
import { FeedbackRating } from '../models/Feedback.model'; // Import for type casting

/**
 * Submit feedback for completed engagement
 * POST /api/client/feedback
 * Access: Client only
 */
export const submitFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    if (!req.client.engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const feedbackData = validateSubmitFeedback({
      ...req.body,
      engagementId: req.client.engagementId,
    });
    
    // FIXED: Cast rating to FeedbackRating type
    const serviceInput = {
      ...feedbackData,
      rating: feedbackData.rating as FeedbackRating,
      communication: feedbackData.communication as FeedbackRating | undefined,
      quality: feedbackData.quality as FeedbackRating | undefined,
      timeliness: feedbackData.timeliness as FeedbackRating | undefined,
      value: feedbackData.value as FeedbackRating | undefined,
    };
    
    const feedback = await feedbackService.submitFeedback({
      ...serviceInput,
      userId: req.client.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback status for current engagement
 * GET /api/client/feedback/status
 * Access: Client only
 */
export const getFeedbackStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    if (!req.client.engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const hasFeedback = await feedbackService.hasFeedback(req.client.engagementId);
    const completionStatus = await completionService.getCompletionStatus(req.client.engagementId);
    
    res.status(200).json({
      success: true,
      data: {
        hasFeedback,
        isCompleted: completionStatus.isCompleted,
        requiresFeedback: completionStatus.isCompleted && !hasFeedback,
        accessMode: completionStatus.accessMode,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback for current engagement
 * GET /api/client/feedback
 * Access: Client only
 */
export const getMyFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.client) {
      throw new ApiError(401, 'Client authentication required');
    }
    
    if (!req.client.engagementId) {
      throw new ApiError(400, 'No engagement context found');
    }
    
    const feedback = await feedbackService.getFeedbackByEngagement(req.client.engagementId);
    
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: 'No feedback found for this engagement',
      });
      return;
    }
    
    // Remove admin notes from client view
    const clientView = feedback.toObject();
    delete clientView.adminNotes;
    
    res.status(200).json({
      success: true,
      data: { feedback: clientView },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all feedback (admin)
 * GET /api/admin/feedback
 * Access: Admin only
 */
export const getAllFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const filters = validateFeedbackFilters(req.query);
    
    // FIXED: Cast rating to FeedbackRating if present
    const serviceFilters: feedbackService.FeedbackFilters = {
      ...filters,
      rating: filters.rating as FeedbackRating | undefined,
      page: filters.page,
      limit: filters.limit,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      isHighlighted: filters.isHighlighted,
    };
    
    const result = await feedbackService.getAllFeedback(serviceFilters);
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback by ID (admin)
 * GET /api/admin/feedback/:feedbackId
 * Access: Admin only
 */
export const getFeedbackById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { feedbackId } = req.params;
    validateFeedbackId(feedbackId);
    
    const feedback = await FeedbackModel.findById(feedbackId)
      .populate('userId', 'email firstName lastName company')
      .populate('engagementId', 'engagementId serviceName');
    
    if (!feedback) {
      throw new ApiError(404, 'Feedback not found');
    }
    
    res.status(200).json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feedback statistics (admin)
 * GET /api/admin/feedback/stats
 * Access: Admin only
 */
export const getFeedbackStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const filters = validateFeedbackFilters(req.query);
    const query: any = {};
    
    if (filters.startDate || filters.endDate) {
      query.submittedAt = {};
      if (filters.startDate) query.submittedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.submittedAt.$lte = new Date(filters.endDate);
    }
    
    if (filters.rating) {
      query.rating = filters.rating as FeedbackRating;
    }
    
    const stats = await feedbackService.getFeedbackStats(query);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle testimonial highlight (admin)
 * PATCH /api/admin/feedback/:feedbackId/highlight
 * Access: Admin only
 */
export const toggleHighlight = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { feedbackId } = req.params;
    validateFeedbackId(feedbackId);
    
    const { isHighlighted } = req.body;
    
    if (typeof isHighlighted !== 'boolean') {
      throw new ApiError(400, 'isHighlighted must be a boolean');
    }
    
    const feedback = await feedbackService.toggleHighlighted(feedbackId, isHighlighted);
    
    res.status(200).json({
      success: true,
      message: `Feedback ${isHighlighted ? 'highlighted' : 'unhighlighted'} successfully`,
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add admin notes to feedback
 * POST /api/admin/feedback/:feedbackId/notes
 * Access: Admin only
 */
export const addAdminNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { feedbackId } = req.params;
    validateFeedbackId(feedbackId);
    
    const { notes } = req.body;
    
    if (!notes || typeof notes !== 'string') {
      throw new ApiError(400, 'Notes are required and must be a string');
    }
    
    const feedback = await feedbackService.addAdminNotes(feedbackId, notes);
    
    res.status(200).json({
      success: true,
      message: 'Admin notes added successfully',
      data: { feedback },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete feedback (admin)
 * DELETE /api/admin/feedback/:feedbackId
 * Access: Admin only
 */
export const deleteFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { feedbackId } = req.params;
    validateFeedbackId(feedbackId);
    
    await feedbackService.deleteFeedback(feedbackId, req.admin.id);
    
    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get engagements needing feedback (admin)
 * GET /api/admin/feedback/needed
 * Access: Admin only
 */
export const getEngagementsNeedingFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const engagements = await completionService.getEngagementsNeedingFeedback();
    
    res.status(200).json({
      success: true,
      data: { engagements },
      count: engagements.length,
    });
  } catch (error) {
    next(error);
  }
};