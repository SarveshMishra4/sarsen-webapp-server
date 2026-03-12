import { Request, Response, NextFunction } from 'express';
import { messageService } from './message.service.js';
import { sendMessageSchema } from './message.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const messageController = {

  /**
   * POST /engagements/:id/messages
   * Called by both user and admin — role is determined by which middleware ran.
   * req.userId / req.adminId is set by requireUser / requireAdmin respectively.
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
if (!parsed.success) {
        // Use optional chaining (?.) and a fallback string to satisfy TypeScript
        const errorMessage = parsed.error?.issues?.[0]?.message || 'Invalid input provided';
        throw new AppError(errorMessage, 400);
      }

      // Determine sender identity from whichever middleware ran
      const isAdmin   = !!req.adminId;
      const senderId  = isAdmin ? req.adminId! : req.userId!;
      const senderRole = isAdmin ? 'admin' : 'user';

      const message = await messageService.sendMessage(
        req.params.id as string, // FIXED: Explicitly cast to string
        senderId,
        senderRole as 'user' | 'admin',
        parsed.data.content
      );

      res.status(201).json(
        formatResponse(true, 'Message sent.', message)
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /engagements/:id/messages
   * Both user and admin can retrieve — same logic, same endpoint.
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin      = !!req.adminId;
      const requesterId  = isAdmin ? req.adminId! : req.userId!;
      const requesterRole = isAdmin ? 'admin' : 'user';

      const messages = await messageService.getMessages(
        req.params.id as string, // FIXED: Explicitly cast to string
        requesterId,
        requesterRole as 'user' | 'admin'
      );

      res.status(200).json(
        formatResponse(true, 'Messages retrieved.', {
          messages,
          total: messages.length,
        })
      );
    } catch (err) {
      next(err);
    }
  },
};