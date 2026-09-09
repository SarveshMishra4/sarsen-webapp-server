import { ReportInterest, IReportInterest } from './report-interest.model.js';
import { logger } from '../../core/logger/logger.js';
import { notificationService } from '../notifications/notification.service.js';
import type { SubmitReportInterestInput } from './report-interest.validator.js';

export const reportInterestService = {

  async submitReportInterest(
    input: SubmitReportInterestInput
  ): Promise<IReportInterest> {
    const submission = await ReportInterest.create({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      describesYou: input.describesYou,
      businessStage: input.businessStage,
      uncertainty: input.uncertainty,
    });

    logger.info('[ReportInterest] New report interest submitted', {
      id: submission._id.toString(),
      email: submission.email,
    });

    // Notify all admins of new report-interest submission.
    // Not scoped to a specific adminId — use 'admin-global', matching contact module.
    // Intentionally not awaited so we don't block the visitor's response.
    notificationService.createNotification({
      recipientId:   'admin-global',
      recipientRole: 'admin',
      type:          'report_interest_submitted',
      message:       `New report interest submission from ${submission.email}.`,
    });

    return submission;
  },

  async getAllSubmissions(): Promise<IReportInterest[]> {
    return ReportInterest.find().sort({ createdAt: -1 });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // getSubmissionById / updateStatus can be added later, same pattern as
  // contact.service.ts, if you decide you want status management after all.
  // ─────────────────────────────────────────────────────────────────────────
};
