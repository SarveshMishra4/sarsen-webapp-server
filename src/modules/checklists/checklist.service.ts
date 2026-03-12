import mongoose from 'mongoose';
import { Engagement, IEngagement, IEngagementChecklistStep } from '../engagements/engagement.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';
import { notificationService } from '../notifications/notification.service.js';

// ─── Progress Calculation ─────────────────────────────────────────────────────
// Exact percentage — never rounded. canDeliver is set only when exactly 100.

const recalculateProgress = (checklist: IEngagementChecklistStep[]): {
  progressPercent: number;
  canDeliver: boolean;
} => {
  if (checklist.length === 0) {
    return { progressPercent: 0, canDeliver: false };
  }

  const completed    = checklist.filter((s) => s.isCompleted).length;
  const progressPercent = (completed / checklist.length) * 100;
  const canDeliver   = progressPercent === 100;

  return { progressPercent, canDeliver };
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const checklistService = {

  /**
   * toggleStep
   *
   * Admin toggles a single checklist step complete/incomplete.
   * Recalculates progressPercent and canDeliver after every toggle.
   * Blocked if engagement is delivered.
   */
  async toggleStep(
    engagementId: string,
    stepId: string,
    isCompleted: boolean
  ): Promise<IEngagement> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.status === 'delivered') {
      throw new AppError('Cannot modify checklist on a delivered engagement.', 403);
    }

    const step = engagement.engagementChecklist.find((s) => s.stepId === stepId);
    if (!step) throw new AppError(`Step "${stepId}" not found in checklist.`, 404);

    step.isCompleted = isCompleted;

    const { progressPercent, canDeliver } = recalculateProgress(engagement.engagementChecklist);
    engagement.progressPercent = progressPercent;
    engagement.canDeliver      = canDeliver;

    await engagement.save();

    logger.info('[Checklist] Step toggled', {
      engagementId,
      stepId,
      isCompleted,
      progressPercent,
      canDeliver,
    });

    return engagement;
  },

  /**
   * updateChecklist
   *
   * Admin replaces the entire checklist structure — add steps, remove steps, reorder.
   * Existing isCompleted values are preserved for steps that still exist by stepId.
   * New steps default to isCompleted: false.
   * Blocked if engagement is delivered.
   */
  async updateChecklist(
    engagementId: string,
    newSteps: { stepId: string; title: string; order: number }[]
  ): Promise<IEngagement> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.status === 'delivered') {
      throw new AppError('Cannot edit checklist on a delivered engagement.', 403);
    }

    // Preserve isCompleted for steps that already exist
    const existingMap = new Map(
      engagement.engagementChecklist.map((s) => [s.stepId, s.isCompleted])
    );

    engagement.engagementChecklist = newSteps.map((s) => ({
      stepId:      s.stepId,
      title:       s.title,
      order:       s.order,
      isCompleted: existingMap.get(s.stepId) ?? false,
    }));

    const { progressPercent, canDeliver } = recalculateProgress(engagement.engagementChecklist);
    engagement.progressPercent = progressPercent;
    engagement.canDeliver      = canDeliver;

    await engagement.save();

    logger.info('[Checklist] Checklist structure updated', {
      engagementId,
      stepCount:    newSteps.length,
      progressPercent,
    });

    return engagement;
  },

  /**
   * getChecklist
   *
   * Returns the engagement checklist and progress for display.
   * User: ownership enforced — 403 if not their engagement.
   * Admin: no ownership check.
   */
  async getChecklist(
    engagementId: string,
    requesterId: string,
    requesterRole: 'user' | 'admin'
  ): Promise<{ checklist: IEngagementChecklistStep[]; progressPercent: number; canDeliver: boolean; status: string }> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (requesterRole === 'user' && engagement.userId.toString() !== requesterId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    return {
      checklist:      engagement.engagementChecklist,
      progressPercent: engagement.progressPercent,
      canDeliver:     engagement.canDeliver,
      status:         engagement.status,
    };
  },

  /**
   * deliverEngagement
   *
   * Admin marks the engagement as delivered.
   * Only allowed when progressPercent is exactly 100.
   * Sets status to 'delivered' — this locks messaging and questionnaire submission.
   */
  async deliverEngagement(engagementId: string): Promise<IEngagement> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (engagement.status === 'delivered') {
      throw new AppError('This engagement has already been delivered.', 409);
    }

    if (engagement.progressPercent !== 100) {
      throw new AppError(
        `Cannot deliver — progress is ${engagement.progressPercent}%. All checklist steps must be completed first.`,
        403
      );
    }

    engagement.status     = 'delivered';
    engagement.canDeliver = false; // Reset — no longer actionable
    await engagement.save();

    logger.info('[Checklist] Engagement delivered', { engagementId });

    // Notify user that engagement has been delivered
    // Note: Intentionally not using 'await' to avoid blocking the response
    notificationService.createNotification({
      recipientId:   engagement.userId.toString(),
      recipientRole: 'user',
      type:          'engagement_delivered',
      message:       'Your engagement has been delivered. Please leave your feedback.',
      engagementId:  engagementId,
    });

    return engagement;
  },
};