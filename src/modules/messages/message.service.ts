import mongoose from 'mongoose';
import { Message, IMessage, SenderRole } from './message.model.js';
import { Engagement } from '../engagements/engagement.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { notificationService } from '../notifications/notification.service.js';

export const messageService = {

  /**
   * sendMessage
   *
   * Sends a message within an engagement.
   * Called by both user and admin — senderRole distinguishes them.
   *
   * Rules:
   * - Engagement must exist
   * - User can only message on their own engagement
   * - Messaging is blocked when engagement status is 'delivered'
   */
  async sendMessage(
    engagementId: string,
    senderId: string,
    senderRole: SenderRole,
    content: string
  ): Promise<IMessage> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    // Ownership check — users can only message on their own engagement
    if (senderRole === 'user' && engagement.userId.toString() !== senderId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    // Lock check — no messages after delivery
    if (engagement.status === 'delivered') {
      throw new AppError(
        'This engagement has been delivered. Messaging is no longer available.',
        403
      );
    }

    const message = await Message.create({
      engagementId,
      senderId,
      senderRole,
      content,
    });

    logger.info('[Messages] Message sent', {
      engagementId,
      senderRole,
      senderId,
    });

    // Notify the recipient — user gets notified when admin sends, admin gets notified when user sends
    const recipientId   = senderRole === 'user' ? 'admin-global' : engagement.userId.toString();
    const recipientRole = senderRole === 'user' ? 'admin' : 'user';
    
    // Note: Intentionally not using 'await' here to prevent notification failures 
    // from breaking the message delivery or slowing down the response.
    notificationService.createNotification({
      recipientId,
      recipientRole,
      type:         'new_message',
      message:      `New message received in your engagement.`,
      engagementId: engagementId,
    });

    return message;
  },

  /**
   * getMessages
   *
   * Returns all messages for an engagement in chronological order.
   * Both user and admin can retrieve — ownership enforced for user.
   */
  async getMessages(
    engagementId: string,
    requesterId: string,
    requesterRole: SenderRole
  ): Promise<IMessage[]> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    // Users can only read messages from their own engagement
    if (requesterRole === 'user' && engagement.userId.toString() !== requesterId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    return Message.find({ engagementId }).sort({ createdAt: 1 });
  },
};