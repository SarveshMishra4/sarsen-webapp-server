/**
 * Message Controller
 * 
 * Handles HTTP requests for messaging:
 * - Sending messages
 * - Fetching messages
 * - Marking messages as read
 * - Getting unread counts
 */

import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service';
import { validateSendMessage, validateMessageFilters } from '../validators/message.validator';
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Send a message in an engagement
 * POST /api/messages
 * Access: Client or Admin (with engagement access)
 */
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Determine sender from auth
    let senderId: string | undefined;
    let senderType: 'admin' | 'client' | undefined;
    
    if (req.admin) {
      senderId = req.admin.id;
      senderType = 'admin';
    } else if (req.client) {
      senderId = req.client.id;
      senderType = 'client';
    } else {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Validate request body
    const messageData = validateSendMessage(req.body);
    
    // Ensure engagementId matches authenticated client's engagement if needed
    if (senderType === 'client' && req.client?.engagementId) {
      // If client is scoped to a specific engagement, they can only message there
      if (req.client.engagementId !== messageData.engagementId) {
        throw new ApiError(403, 'You can only send messages to your current engagement');
      }
    }
    
    const message = await messageService.sendMessage({
      ...messageData,
      senderId,
      senderType,
    });
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages for an engagement
 * GET /api/messages/:engagementId
 * Access: Client or Admin (with engagement access)
 */
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { engagementId } = req.params;
    
    
    
    // Determine viewer
    let viewerId: string | undefined;
    let viewerType: 'admin' | 'client' | undefined;
    
    if (req.admin) {
      viewerId = req.admin.id;
      viewerType = 'admin';
    } else if (req.client) {
      viewerId = req.client.id;
      viewerType = 'client';
      
      // If client is scoped to a specific engagement, verify they're accessing the right one
      if (req.client.engagementId && req.client.engagementId !== engagementId) {
        throw new ApiError(403, 'You do not have access to this engagement');
      }
    } else {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Parse filters from query
    const filters = validateMessageFilters(req.query);
    
    // FIXED: Convert string dates to Date objects for the service
    const serviceFilters: messageService.MessageFilters = {
      page: filters.page,
      limit: filters.limit,
    };
    
    // Convert before date if provided
    if (filters.before) {
      serviceFilters.before = new Date(filters.before);
    }
    
    // Convert after date if provided
    if (filters.after) {
      serviceFilters.after = new Date(filters.after);
    }
    
    const result = await messageService.getMessages(
      engagementId,
      serviceFilters,
      viewerId,
      viewerType
    );
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark messages as read
 * PATCH /api/messages/:engagementId/read
 * Access: Client or Admin (with engagement access)
 */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { engagementId } = req.params;
    
    // Determine viewer
    let viewerId: string | undefined;
    
    if (req.admin) {
      viewerId = req.admin.id;
    } else if (req.client) {
      viewerId = req.client.id;
    } else {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Validate engagement ID
    
    
    // Optional message IDs in body
    const { messageIds } = req.body;
    
    await messageService.markAsRead(engagementId, viewerId, messageIds);
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count
 * GET /api/messages/:engagementId/unread
 * Access: Client or Admin (with engagement access)
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { engagementId } = req.params;
    
    // Determine viewer
    let viewerId: string | undefined;
    
    if (req.admin) {
      viewerId = req.admin.id;
    } else if (req.client) {
      viewerId = req.client.id;
    } else {
      throw new ApiError(401, 'Authentication required');
    }
    console.log("VIEWER ID GOING TO SERVICE:", viewerId);
    // Validate engagement ID
    
    
    const unreadCount = await messageService.getUnreadCount(engagementId, viewerId);
    
    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recent messages across all engagements (admin only)
 * GET /api/admin/messages/recent
 * Access: Admin only
 */
export const getRecentMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const limit = parseInt(req.query.limit as string) || 10;
    
    const messages = await messageService.getRecentMessages(limit);
    
    res.status(200).json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message (admin only)
 * DELETE /api/admin/messages/:messageId
 * Access: Admin only
 */
export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.admin) {
      throw new ApiError(401, 'Admin authentication required');
    }
    
    const { messageId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ApiError(400, 'Invalid message ID format');
    }
    
    await messageService.deleteMessage(messageId, req.admin.id);
    
    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};