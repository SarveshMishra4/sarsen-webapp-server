/**
 * Message Service
 * 
 * Contains business logic for engagement-scoped messaging:
 * - Sending messages
 * - Fetching messages for an engagement
 * - Marking messages as read
 * - Counting unread messages
 * - Enforcing messaging rules based on engagement status
 */

import { Message, IMessage } from '../models/Message.model';
import { Engagement } from '../models/Engagement.model';
import { User } from '../models/User.model';
import { Admin } from '../models/Admin.model';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error.middleware';
import mongoose from 'mongoose';

export interface SendMessageInput {
  engagementId: string;
  senderId: string;
  senderType: 'admin' | 'client';
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
  before?: Date;
  after?: Date;
}

/**
 * Send a new message in an engagement
 * @param input - Message input data
 * @returns Created message
 */
export const sendMessage = async (
  input: SendMessageInput
): Promise<IMessage> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { engagementId, senderId, senderType, content, attachments } = input;
    
    // 1. Get engagement to check messaging is allowed
    const engagement = await Engagement.findById(engagementId).session(session);
    
    if (!engagement) {
      throw new ApiError(404, 'Engagement not found');
    }
    
    // 2. Check if messaging is allowed
    if (!engagement.messagingAllowed) {
      throw new ApiError(403, 'Messaging is disabled for this engagement');
    }
    
    // 3. Check if engagement is completed
    if (engagement.isCompleted) {
      throw new ApiError(403, 'Cannot send messages in a completed engagement');
    }
    
    // 4. Verify sender exists and get name for snapshot
    let senderName = '';
    
    if (senderType === 'admin') {
      const admin = await Admin.findById(senderId).session(session);
      if (!admin) {
        throw new ApiError(404, 'Admin sender not found');
      }
      senderName = admin.email; // or admin.name if you have that field
    } else {
      const user = await User.findById(senderId).session(session);
      if (!user) {
        throw new ApiError(404, 'User sender not found');
      }
      senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    }
    
    // 5. Create message
    const [message] = await Message.create([{
      engagementId,
      senderId,
      senderType,
      senderName,
      content,
      attachments,
      isRead: false,
    }], { session });
    
    // 6. Increment message count on engagement
    engagement.messageCount = (engagement.messageCount || 0) + 1;
    await engagement.save({ session });
    
    await session.commitTransaction();
    
    logger.info(`Message sent in engagement ${engagementId} by ${senderType}`);
    
    return message;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get messages for an engagement
 * @param engagementId - Engagement ID
 * @param filters - Pagination and date filters
 * @param viewerId - ID of person viewing (for read receipt tracking)
 * @param viewerType - Type of viewer (admin/client)
 * @returns Messages with pagination info
 */
export const getMessages = async (
  engagementId: string,
  filters: MessageFilters = {},
  viewerId?: string,
  viewerType?: 'admin' | 'client'
): Promise<{ messages: IMessage[]; total: number; unreadCount: number }> => {
  try {
    const { page = 1, limit = 50, before, after } = filters;
    
    const query: any = { engagementId };
    
    if (before) {
      query.createdAt = { $lt: before };
    }
    
    if (after) {
      query.createdAt = { ...query.createdAt, $gt: after };
    }
    
    const skip = (page - 1) * limit;
    
    // Get messages
    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments(query),
    ]);
    
    // Get unread count for this engagement
    const unreadCount = await Message.countDocuments({
      engagementId,
      isRead: false,
      senderId: { $ne: viewerId }, // Messages sent by others
    });
    
    // If viewer is provided, mark messages as read
    if (viewerId && viewerType && messages.length > 0) {
      const messageIds = messages
        .filter(m => m.senderId.toString() !== viewerId) // Don't mark own messages
        .map(m => m._id);
      
      if (messageIds.length > 0) {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          {
            $set: { isRead: true },
            $push: {
              readBy: {
                userId: new mongoose.Types.ObjectId(viewerId),
                readAt: new Date(),
              },
            },
          }
        );
      }
    }
    
    return {
      messages: messages.reverse(), // Return in chronological order
      total,
      unreadCount,
    };
  } catch (error) {
    logger.error('Error fetching messages:', error);
    throw new ApiError(500, 'Failed to fetch messages');
  }
};

/**
 * Mark messages as read
 * @param engagementId - Engagement ID
 * @param userId - User ID marking as read
 * @param messageIds - Optional specific message IDs (if not provided, marks all)
 */
export const markAsRead = async (
  engagementId: string,
  userId: string,
  messageIds?: string[]
): Promise<void> => {
  try {
    const query: any = {
      engagementId,
      isRead: false,
      senderId: { $ne: userId }, // Don't mark own messages
    };
    
    if (messageIds && messageIds.length > 0) {
      query._id = { $in: messageIds };
    }
    
    const result = await Message.updateMany(
      query,
      {
        $set: { isRead: true },
        $push: {
          readBy: {
            userId: new mongoose.Types.ObjectId(userId),
            readAt: new Date(),
          },
        },
      }
    );
    
    logger.info(`Marked ${result.modifiedCount} messages as read in engagement ${engagementId}`);
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    throw new ApiError(500, 'Failed to mark messages as read');
  }
};

/**
 * Get unread message count for an engagement
 * @param engagementId - Engagement ID
 * @param userId - User ID (to exclude own messages)
 * @returns Number of unread messages
 */
export const getUnreadCount = async (
  engagementId: string,
  userId: string
): Promise<number> => {
  try {
    return await Message.countDocuments({
      engagementId,
      isRead: false,
      senderId: { $ne: userId },
    });
  } catch (error) {
    logger.error('Error getting unread count:', error);
    throw new ApiError(500, 'Failed to get unread count');
  }
};

/**
 * Get recent messages across all engagements for admin dashboard
 * @param limit - Number of recent messages
 * @returns Recent messages with engagement info
 */
export const getRecentMessages = async (
  limit: number = 10
): Promise<any[]> => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('engagementId', 'engagementId serviceName')
      .lean();
    
    return messages.map(msg => ({
      id: msg._id,
      content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
      senderType: msg.senderType,
      senderName: msg.senderName,
      createdAt: msg.createdAt,
      engagement: msg.engagementId,
    }));
  } catch (error) {
    logger.error('Error fetching recent messages:', error);
    throw new ApiError(500, 'Failed to fetch recent messages');
  }
};

/**
 * Delete a message (admin only)
 * @param messageId - Message ID
 * @param adminId - Admin ID performing deletion
 */
export const deleteMessage = async (
  messageId: string,
  adminId: string
): Promise<void> => {
  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new ApiError(404, 'Message not found');
    }
    
    // Only admins can delete messages
    // Soft delete could be implemented here if needed
    
    await message.deleteOne();
    
    // Decrement message count on engagement
    await Engagement.findByIdAndUpdate(
      message.engagementId,
      { $inc: { messageCount: -1 } }
    );
    
    logger.info(`Message ${messageId} deleted by admin ${adminId}`);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error deleting message:', error);
    throw new ApiError(500, 'Failed to delete message');
  }
};