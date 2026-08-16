import { Request, Response, NextFunction } from 'express';
import { leadMagnetService } from './leadmagnet.service.js';
import { submitBusinessHeatMapSchema } from './leadmagnet.validator.js';
import { LEAD_MAGNET_TYPES, LeadMagnetType } from './leadmagnet.constants.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const leadMagnetController = {

  // ── Public ─────────────────────────────────────────────────────────────

  async submitBusinessHeatMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = submitBusinessHeatMapSchema.safeParse(req.body);

      if (!parsed.success) {
        const errorMessage = parsed.error.issues[0]?.message || 'Invalid submission';
        throw new AppError(errorMessage, 400);
      }

      const { email, founderName, companyName, industry, answers } = parsed.data;
      const { submissionId, clientStatus, result } =
        await leadMagnetService.submitBusinessHeatMap(email, founderName, companyName, industry, answers);

      res.status(201).json(
        formatResponse(true, 'Submission received.', {
          submissionId,
          clientStatus,
          result,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  // ── Admin ──────────────────────────────────────────────────────────────

  /**
   * GET /leadmagnets/admin?status=new|old&search=&leadMagnetType=&page=&limit=
   */
  async getAdminLeadsList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status === 'new' || req.query.status === 'old'
        ? req.query.status
        : undefined;

      const leadMagnetTypeRaw = typeof req.query.leadMagnetType === 'string' ? req.query.leadMagnetType : undefined;
      const leadMagnetType = leadMagnetTypeRaw && (LEAD_MAGNET_TYPES as readonly string[]).includes(leadMagnetTypeRaw)
        ? (leadMagnetTypeRaw as LeadMagnetType)
        : undefined;

      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const result = await leadMagnetService.getAdminLeadsList({
        ...(status !== undefined && { status }),
        ...(search !== undefined && { search }),
        ...(leadMagnetType !== undefined && { leadMagnetType }),
        ...(page !== undefined && { page }),
        ...(limit !== undefined && { limit }),
      });

      res.status(200).json(formatResponse(true, 'Leads retrieved.', result));
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /leadmagnets/admin/:clientId/submissions
   */
  async getAdminLeadSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const submissions = await leadMagnetService.getClientSubmissions(req.params.clientId as string);
      res.status(200).json(formatResponse(true, 'Submissions retrieved.', { submissions }));
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /leadmagnets/admin/:clientId/view
   */
  async markAdminLeadViewed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.adminId) {
        throw new AppError('Admin identity missing from request', 401);
      }
      const client = await leadMagnetService.markLeadViewed(req.params.clientId as string, req.adminId);
      res.status(200).json(formatResponse(true, 'Lead marked as viewed.', { client }));
    } catch (err) {
      next(err);
    }
  },
};