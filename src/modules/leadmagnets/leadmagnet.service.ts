import { Client, LeadMagnetSubmission, ILeadMagnetSubmission } from './leadmagnet.model.js';
import { CANVAS_AREA_KEYS, QUESTION_TO_CANVAS_AREA, CanvasAreaKey, AnswerScaleValue } from './leadmagnet.constants.js';
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

async function resolveClient(email: string): Promise<{ clientId: string; isNewClient: boolean }> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await Client.findOne({ email: normalizedEmail });
  if (existing) {
    existing.submissionCount += 1;
    await existing.save();
    return { clientId: existing._id.toString(), isNewClient: false };
  }

  const created = await Client.create({ email: normalizedEmail, submissionCount: 1 });
  return { clientId: created._id.toString(), isNewClient: true };
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
};