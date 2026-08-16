import mongoose from 'mongoose';
import { Client, LeadMagnetSubmission, ILeadMagnetSubmission, IClient } from './leadmagnet.model.js';
import { CANVAS_AREA_KEYS, QUESTION_TO_CANVAS_AREA, CanvasAreaKey, AnswerScaleValue, LeadMagnetType } from './leadmagnet.constants.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

// ─── Result shape for the Business Heat Map ──────────────────────────────────

interface AreaScore {
  area: CanvasAreaKey;
  score: number;
}

interface BusinessHeatMapResult {
  overallScore: number | null;
  areaScores: Record<CanvasAreaKey, number | null>;
  priorities: AreaScore[]; // 3 weakest areas, ascending
}

// ─── Scoring ──────────────────────────────────────────────────────────────
// Mirrors the frontend's getAreaScore/overall-average logic exactly, so the
// number a founder sees on screen matches what gets stored. Works against
// whatever question set is currently in QUESTION_TO_CANVAS_AREA (15 questions
// as of v2), so it stays correct automatically if that map changes.

function computeBusinessHeatMapResult(answers: Record<string, AnswerScaleValue>): BusinessHeatMapResult {
  const areaScores = {} as Record<CanvasAreaKey, number | null>;

  for (const area of CANVAS_AREA_KEYS) {
    const questionIdsForArea = Object.entries(QUESTION_TO_CANVAS_AREA)
      .filter(([, a]) => a === area)
      .map(([qId]) => qId);

    const values = questionIdsForArea
      .map((qId) => answers[qId])
      .filter((v): v is AnswerScaleValue => v !== undefined);

    areaScores[area] = values.length > 0
      ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
      : null;
  }

  const scoredAreaValues = Object.values(areaScores).filter((v): v is number => v !== null);
  const overallScore = scoredAreaValues.length > 0
    ? Math.round((scoredAreaValues.reduce((a, b) => a + b, 0) / scoredAreaValues.length) * 10) / 10
    : null;

  const priorities: AreaScore[] = (Object.entries(areaScores) as [CanvasAreaKey, number | null][])
    .filter((entry): entry is [CanvasAreaKey, number] => entry[1] !== null)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([area, score]) => ({ area, score }));

  return { overallScore, areaScores, priorities };
}

// ─── Client resolution ────────────────────────────────────────────────────
// Finds an existing client by normalized email, or creates one. Returns
// whether the client was new BEFORE this submission, so callers can mark
// the submission accordingly.
//
// PHASE 2 CHANGE: now also bumps `lastActivityAt` to "now" on every call,
// for both branches. This is the field the admin Leads list sorts by.
// Deliberately does NOT touch `isViewed` — that flag is only ever set by
// the admin "mark viewed" action (see markLeadViewed below), never here.

async function resolveClient(email: string): Promise<{ clientId: string; isNewClient: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();

  const existing = await Client.findOne({ email: normalizedEmail });
  if (existing) {
    existing.submissionCount += 1;
    existing.lastActivityAt = now;
    await existing.save();
    return { clientId: existing._id.toString(), isNewClient: false };
  }

  const created = await Client.create({
    email: normalizedEmail,
    submissionCount: 1,
    lastActivityAt: now,
  });
  return { clientId: created._id.toString(), isNewClient: true };
}

// ─── Admin: Leads list types ───────────────────────────────────────────────

export interface AdminLeadListItem {
  clientId: string;
  email: string;
  isViewed: boolean;
  viewedAt?: Date;
  lastActivityAt: Date;
  submissionCount: number;
  leadMagnetTypes: LeadMagnetType[]; // distinct types this client has used
  latestSubmission: {
    leadMagnet: LeadMagnetType;
    founderName: string;
    companyName: string;
    createdAt: Date;
  } | null;
}

export interface GetAdminLeadsListOptions {
  status?: 'new' | 'old'; // maps to isViewed false/true
  search?: string;        // matches email OR latest submission's founderName/companyName
  leadMagnetType?: LeadMagnetType; // only leads who have at least one submission of this type
  page?: number;
  limit?: number;
}

// ─── Public service methods ────────────────────────────────────────────────

export const leadMagnetService = {

  async submitBusinessHeatMap(
    email: string,
    founderName: string,
    companyName: string,
    industry: string,
    answers: Record<string, AnswerScaleValue>
  ): Promise<{
    submissionId: string;
    clientStatus: 'new' | 'existing';
    result: BusinessHeatMapResult;
  }> {
    const { clientId, isNewClient } = await resolveClient(email);
    const result = computeBusinessHeatMapResult(answers);

    const submission: ILeadMagnetSubmission = await LeadMagnetSubmission.create({
      clientId,
      leadMagnet: 'business_heat_map',
      founderName,
      companyName,
      industry,
      answers,
      result,
      clientStatusAtSubmission: isNewClient ? 'new' : 'existing',
    });

    logger.info('[LeadMagnet] Business Heat Map submission stored', {
      submissionId: submission._id.toString(),
      clientId,
      clientStatus: isNewClient ? 'new' : 'existing',
      overallScore: result.overallScore,
    });

    return {
      submissionId: submission._id.toString(),
      clientStatus: isNewClient ? 'new' : 'existing',
      result,
    };
  },

  // ── Admin: Phase 3 ────────────────────────────────────────────────────

  /**
   * GET /leadmagnets/admin (paginated, filterable, searchable list of Leads)
   *
   * NOTE ON SEARCH: `Client` only stores `email`. founderName/companyName
   * live on individual Submission documents, not on the Client itself.
   * So matching by name requires looking inside each client's submissions.
   * We do this with an aggregation $lookup rather than a second query per
   * client (N+1), which would not scale as the lead count grows.
   */
  async getAdminLeadsList(opts: GetAdminLeadsListOptions): Promise<{
    leads: AdminLeadListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 25));

    const matchStage: Record<string, unknown> = {};
    if (opts.status === 'new') matchStage.isViewed = false;
    if (opts.status === 'old') matchStage.isViewed = true;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: LeadMagnetSubmission.collection.name,
          let: { clientId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$clientId', '$$clientId'] } } },
            { $sort: { createdAt: -1 } },
          ],
          as: 'submissions',
        },
      },
      {
        $addFields: {
          latestSubmission: { $arrayElemAt: ['$submissions', 0] },
          leadMagnetTypes: { $setUnion: ['$submissions.leadMagnet', []] },
          submissionCountActual: { $size: '$submissions' },
        },
      },
    ];

    if (opts.leadMagnetType) {
      pipeline.push({ $match: { leadMagnetTypes: opts.leadMagnetType } });
    }

    if (opts.search) {
      const regex = new RegExp(opts.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { email: regex },
            { 'latestSubmission.founderName': regex },
            { 'latestSubmission.companyName': regex },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { lastActivityAt: -1 } },
      {
        $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      }
    );

    const [result] = await Client.aggregate(pipeline);
    const docs = result?.data || [];
    const total = result?.totalCount?.[0]?.count || 0;

    const leads: AdminLeadListItem[] = docs.map((doc: any) => ({
      clientId: doc._id.toString(),
      email: doc.email,
      isViewed: doc.isViewed,
      viewedAt: doc.viewedAt,
      lastActivityAt: doc.lastActivityAt,
      submissionCount: doc.submissionCountActual,
      leadMagnetTypes: doc.leadMagnetTypes || [],
      latestSubmission: doc.latestSubmission
        ? {
            leadMagnet: doc.latestSubmission.leadMagnet,
            founderName: doc.latestSubmission.founderName,
            companyName: doc.latestSubmission.companyName,
            createdAt: doc.latestSubmission.createdAt,
          }
        : null,
    }));

    return { leads, total, page, limit };
  },

  /**
   * GET /leadmagnets/admin/:clientId/submissions
   * All submissions for one lead, newest first — powers the expanded
   * "reports" list under a lead row.
   */
  async getClientSubmissions(clientId: string): Promise<ILeadMagnetSubmission[]> {
    const client = await Client.findById(clientId);
    if (!client) throw new AppError('Lead not found', 404);

    return LeadMagnetSubmission.find({ clientId }).sort({ createdAt: -1 });
  },

  /**
   * PATCH /leadmagnets/admin/:clientId/view
   * One-way flip. Called the first time an admin expands a lead's row.
   * Safe to call more than once — no-ops if already viewed, so the
   * frontend doesn't need to track viewed-state itself before calling.
   */
  async markLeadViewed(clientId: string, adminId: string): Promise<IClient> {
    const client = await Client.findById(clientId);
    if (!client) throw new AppError('Lead not found', 404);

    if (!client.isViewed) {
      client.isViewed = true;
      client.viewedAt = new Date();
      client.viewedBy = adminId;
      await client.save();
      logger.info('[LeadMagnet][Admin] Lead marked viewed', { clientId, adminId });
    }

    return client;
  },
};