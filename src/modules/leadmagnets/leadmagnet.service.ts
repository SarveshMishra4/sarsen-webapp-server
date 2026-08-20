import mongoose from 'mongoose';
import { Client, LeadMagnetSubmission, ILeadMagnetSubmission, IClient } from './leadmagnet.model.js';
import { LeadMagnetType, AnswerScaleValue } from './leadmagnet.constants.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

// ─── Diagnostic Engine (ported from businessDiagnosticEngine.ts) ──────────

export type CurrentOutputKey =
  | 'business_understanding'
  | 'landscape_understanding'
  | 'market_acceptance'
  | 'competitive_position'
  | 'customer_readiness'
  | 'business_model_strength'
  | 'financial_understanding'
  | 'management_quality'
  | 'risk_control';

export type FutureOutputKey =
  | 'plan_achievability'
  | 'fundability'
  | 'planning'
  | 'future_possibility'
  | 'executeability'
  | 'survivability'
  | 'strategic_flexibility'
  | 'six_month_readiness'
  | 'growth_readiness';

export type OutputKey = CurrentOutputKey | FutureOutputKey;

type ConditionOperator = '>=' | '<=' | '>' | '<' | '==';

type ContradictionRule = {
  id: string;
  name: string;
  conditions: [OutputKey, ConditionOperator, number][];
  severity: number;
  statement: string;
  intervention: string;
};

type OutputMeta = { label: string; description: string };

const CURRENT_OUTPUTS: Record<CurrentOutputKey, OutputMeta> = {
  business_understanding: {
    label: 'Business Understanding',
    description: 'How well the founder understands their own business — proposition, economics, and metrics together.',
  },
  landscape_understanding: {
    label: 'Landscape Understanding',
    description: 'How much the founder has actually studied competitors, regulation, and the external environment.',
  },
  market_acceptance: {
    label: 'Market Acceptance',
    description: 'Evidence that the market genuinely wants what is being offered — not just stated intention.',
  },
  competitive_position: {
    label: 'Competitive Position',
    description: 'How differentiated and defensible the business is against competitors.',
  },
  customer_readiness: {
    label: 'Customer Readiness',
    description: 'Depth of customer-side evidence, from segment clarity through to tracked behaviour.',
  },
  business_model_strength: {
    label: 'Business Model Strength',
    description: 'Whether value, payment, revenue, and channels connect into a workable economic engine.',
  },
  financial_understanding: {
    label: 'Financial Understanding',
    description: 'How well the founder understands and can plan the numbers behind the business.',
  },
  management_quality: {
    label: 'Management Quality',
    description: 'Strength of the team and advisory support behind the venture.',
  },
  risk_control: {
    label: 'Risk Control',
    description: 'How prepared the business is to identify and manage risk. Higher is better.',
  },
};

const FUTURE_OUTPUTS: Record<FutureOutputKey, OutputMeta> = {
  plan_achievability: {
    label: 'Plan Achievability',
    description: 'Whether the near-term plan is specific, trackable, and realistically achievable.',
  },
  fundability: {
    label: 'Fundability',
    description: 'Readiness to withstand investor diligence on team, economics, and evidence.',
  },
  planning: {
    label: 'Planning Quality',
    description: 'Depth and specificity of the forward plan, including contingencies.',
  },
  future_possibility: {
    label: 'Future Possibility',
    description: 'A broad forward-readiness signal — not a statistically validated prediction of outcomes.',
  },
  executeability: {
    label: 'Executeability',
    description: 'Demonstrated ability to run a commercial motion end-to-end.',
  },
  survivability: {
    label: 'Survivability',
    description: 'Ability to remain viable under financial and operational uncertainty.',
  },
  strategic_flexibility: {
    label: 'Strategic Flexibility',
    description: 'Ability to change direction based on evidence rather than attachment to the original plan.',
  },
  six_month_readiness: {
    label: '6-Month Readiness',
    description: 'Clarity and measurability of the next milestone.',
  },
  growth_readiness: {
    label: 'Growth Readiness',
    description: 'Whether the business is ready to scale without breaking what already works.',
  },
};

const CURRENT_FORMULAS: Record<CurrentOutputKey, Record<number, number>> = {
  business_understanding: {
    1: 1.5, 2: 2.0, 4: 1.0, 6: 1.5, 7: 2.0,
    12: 1.5, 13: 0.75, 10: 1.0, 11: 2.0,
    14: 1.5,
  },
  landscape_understanding: { 1: 1.0, 4: 2.5, 10: 1.0, 13: 2.0 },
  market_acceptance: {
    1: 1.0, 2: 1.5, 3: 3.0, 11: 2.0,
    14: 2.0,
  },
  competitive_position: { 2: 1.0, 4: 2.0, 5: 3.0 },
  customer_readiness: {
    1: 1.0, 2: 1.5, 3: 3.0, 11: 2.0, 12: 1.5,
    14: 1.25,
  },
  business_model_strength: {
    2: 1.0, 3: 2.0, 6: 2.5, 7: 2.5,
    15: 1.5,
  },
  financial_understanding: { 7: 1.0 },
  management_quality: { 2: 1.0, 9: 3.0 },
  risk_control: { 13: 2.0, 7: 2.5, 10: 1.5, 4: 1.0, 9: 1.5 },
};

const FUTURE_FORMULAS: Record<FutureOutputKey, Record<number, number>> = {
  plan_achievability: {
    11: 2.0, 12: 2.5, 9: 1.5,
    15: 1.0,
  },
  fundability: {
    7: 2.5, 5: 1.5, 3: 1.5, 9: 2.5,
    14: 1.0,
  },
  planning: {
    12: 2.0, 11: 2.0, 10: 1.5, 6: 1.0, 4: 1.0, 2: 1.0, 1: 0.75,
    14: 1.0,
  },
  future_possibility: {
    1: 0.85, 2: 1.0, 3: 1.25, 4: 0.85, 5: 1.25, 6: 1.0,
    7: 1.5, 9: 1.5, 10: 1.0, 11: 1.5, 12: 1.25, 13: 0.75,
    14: 1.0,
    15: 1.25,
  },
  executeability: {
    6: 2.0, 4: 1.0, 3: 2.0, 2: 1.5, 1: 1.0,
    15: 2.5,
  },
  survivability: { 7: 2.5, 8: 2.0, 9: 1.5, 10: 1.0, 13: 1.5 },
  strategic_flexibility: { 10: 3.0, 4: 1.0, 5: 1.0, 11: 2.0 },
  six_month_readiness: { 12: 3.0, 11: 2.5, 9: 1.0, 10: 1.0 },
  growth_readiness: {
    3: 1.5, 5: 1.25, 6: 2.0, 7: 1.75, 9: 2.0, 11: 1.25, 12: 1.0,
    15: 1.75,
  },
};

const INPUT_SOURCE: Record<number, string> = {
  1: 'q3',
  2: 'q6',
  3: 'q2',
  4: 'q4',
  5: 'q5',
  6: 'q8',
  7: 'q9',
  8: 'q10',
  9: 'q11',
  10: 'q12',
  11: 'q13',
  12: 'q14',
  13: 'q15',
  14: 'q1',
  15: 'q7',
};

const INPUT_NUMBERS = Object.keys(INPUT_SOURCE).map(Number);

const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    id: 'demand_without_economics',
    name: 'Demand appears stronger than economic understanding',
    conditions: [['market_acceptance', '>=', 7], ['financial_understanding', '<=', 4]],
    severity: 9,
    statement:
      'The business appears capable of generating customer interest, but its understanding of the economics is materially weaker. If demand increases before the economic model is understood, growth may amplify losses rather than create a stronger business.',
    intervention: 'Business model / monetisation / financial strategy',
  },
  {
    id: 'customer_without_model',
    name: 'Customer evidence without a strong business model',
    conditions: [['customer_readiness', '>=', 7], ['business_model_strength', '<=', 4]],
    severity: 9,
    statement:
      'There is evidence of customer readiness, but the mechanism for turning customer value into sustainable economics appears weak.',
    intervention: 'Monetisation and business model design',
  },
  {
    id: 'market_without_competitive_position',
    name: 'Market opportunity without competitive protection',
    conditions: [['market_acceptance', '>=', 7], ['competitive_position', '<=', 4]],
    severity: 8,
    statement:
      'The market may accept the proposition, but the business does not appear sufficiently protected from competitive pressure. Success itself may attract competitors.',
    intervention: 'Positioning / differentiation / defensibility',
  },
  {
    id: 'planning_execution_gap',
    name: 'Planning capability exceeds execution capability',
    conditions: [['planning', '>=', 7], ['executeability', '<=', 4]],
    severity: 9,
    statement:
      'The company appears to understand what it should do better than it can consistently execute it. The constraint is likely organisational execution rather than strategic awareness.',
    intervention: 'Operational efficiency / execution system',
  },
  {
    id: 'team_plan_gap',
    name: 'Plan ambition exceeds team capability',
    conditions: [['planning', '>=', 7], ['management_quality', '<=', 4]],
    severity: 8,
    statement:
      'The plan appears more developed than the organisation required to execute it. The company may be strategy-heavy and execution-light.',
    intervention: 'Team design / operating model / execution',
  },
  {
    id: 'funding_without_foundation',
    name: 'Funding ambition exceeds business foundation',
    conditions: [['fundability', '>=', 7], ['business_understanding', '<=', 4]],
    severity: 8,
    statement:
      'The company may be thinking about capital before sufficiently resolving underlying business uncertainties. Capital can buy time, but it cannot substitute for unresolved fundamentals.',
    intervention: 'Business fundamentals before fundraising',
  },
  {
    id: 'growth_without_control',
    name: 'Growth readiness exceeds risk control',
    conditions: [['growth_readiness', '>=', 7], ['risk_control', '<=', 4]],
    severity: 10,
    statement:
      'The business appears capable of pursuing growth, but its risk controls are weak. Scaling under these conditions can magnify existing weaknesses.',
    intervention: 'Risk management / operations / financial controls',
  },
  {
    id: 'market_without_measurement',
    name: 'Customer promise without measurable validation',
    conditions: [['market_acceptance', '>=', 7], ['six_month_readiness', '<=', 4]],
    severity: 8,
    statement:
      'The business appears to have customer-side promise, but has not translated that promise into sufficiently measurable next milestones.',
    intervention: 'Metrics / PMF measurement / milestone planning',
  },
  {
    id: 'competitive_confidence_without_landscape',
    name: 'Competitive confidence without sufficient landscape understanding',
    conditions: [['competitive_position', '>=', 7], ['landscape_understanding', '<=', 4]],
    severity: 7,
    statement:
      'The proposition appears differentiated, but the company may not understand the competitive landscape well enough to know whether that differentiation is durable.',
    intervention: 'Competitive intelligence / positioning',
  },
  {
    id: 'revenue_without_financial_awareness',
    name: 'Commercial activity without financial understanding',
    conditions: [['business_model_strength', '>=', 7], ['financial_understanding', '<=', 4]],
    severity: 9,
    statement:
      'The company appears to have a workable commercial mechanism, but financial understanding is lagging. Revenue alone does not establish a healthy business.',
    intervention: 'Financial model / unit economics / management reporting',
  },
  {
    id: 'pivot_without_measurement',
    name: 'Strategic flexibility without measurable learning',
    conditions: [['strategic_flexibility', '>=', 7], ['six_month_readiness', '<=', 4]],
    severity: 7,
    statement:
      'The company appears willing to change direction, but does not yet have strong measurement mechanisms for deciding what should change.',
    intervention: 'Experimentation / metrics / strategic planning',
  },
  {
    id: 'fundability_without_survival',
    name: 'Fundability does not eliminate survival risk',
    conditions: [['fundability', '>=', 7], ['survivability', '<=', 4]],
    severity: 8,
    statement:
      'The business may appear fundable, but its underlying survival capacity remains weak. Raising capital should not be confused with becoming resilient.',
    intervention: 'Runway / financial planning / operating resilience',
  },
  {
    id: 'strong_current_weak_future',
    name: 'Current business quality exceeds future readiness',
    conditions: [['business_model_strength', '>=', 7], ['future_possibility', '<=', 4]],
    severity: 8,
    statement:
      'The business has reasonable fundamentals today, but the systems required to convert those fundamentals into future progress are weak.',
    intervention: 'Growth strategy / execution / scaling readiness',
  },
  {
    id: 'strong_market_weak_execution',
    name: 'Market opportunity is ahead of execution capability',
    conditions: [['market_acceptance', '>=', 7], ['executeability', '<=', 4]],
    severity: 10,
    statement:
      'The market may be more ready for the business than the business is ready for the market. Execution capacity is likely to become the immediate bottleneck.',
    intervention: 'GTM execution / operations / team capability',
  },
];

const OUTPUT_WEIGHTS: Record<OutputKey, number> = {
  business_understanding: 1.15,
  landscape_understanding: 0.90,
  market_acceptance: 1.15,
  competitive_position: 1.00,
  customer_readiness: 1.10,
  business_model_strength: 1.20,
  financial_understanding: 1.25,
  management_quality: 1.05,
  risk_control: 1.20,
  plan_achievability: 1.00,
  fundability: 0.95,
  planning: 0.90,
  future_possibility: 1.05,
  executeability: 1.20,
  survivability: 1.20,
  strategic_flexibility: 0.90,
  six_month_readiness: 0.95,
  growth_readiness: 1.05,
};

const INTERVENTION_MAP: Record<OutputKey, string> = {
  business_understanding: 'Strategic diagnosis',
  landscape_understanding: 'Competitive intelligence / positioning',
  market_acceptance: 'Product-Market Fit / customer validation',
  competitive_position: 'GTM positioning / competitive strategy',
  customer_readiness: 'Product-Market Fit / customer validation',
  business_model_strength: 'Business model / monetisation',
  financial_understanding: 'Financial model / unit economics',
  management_quality: 'Team / operating model',
  risk_control: 'Risk management / operational controls',
  plan_achievability: 'Execution system / operating cadence',
  fundability: 'Fundraising readiness / capital strategy',
  planning: 'Strategic planning',
  future_possibility: 'Growth strategy / strategic direction',
  executeability: 'Operational efficiency / execution',
  survivability: 'Turnaround / resilience / financial planning',
  strategic_flexibility: 'Strategic adaptation / pivot strategy',
  six_month_readiness: 'Metrics / milestone planning',
  growth_readiness: 'Scaling strategy',
};

// ─── Engine functions ────────────────────────────────────────────────────

function clamp(value: number, minimum = 0, maximum = 10): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function weightedAverageInputs(
  inputs: Record<number, number>,
  weightedInputIds: Record<number, number>
): number {
  let numerator = 0;
  let denominator = 0;
  for (const key of Object.keys(weightedInputIds)) {
    const q = Number(key);
    const weight = weightedInputIds[q]!; // Non-null assertion: keys exist in the record
    numerator += (inputs[q] ?? 0) * weight;
    denominator += weight;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function scoreBand(score: number): string {
  if (score < 3) return 'Critical';
  if (score < 5) return 'Weak';
  if (score < 7) return 'Developing';
  if (score < 8.5) return 'Healthy';
  return 'Strong';
}

function conditionMet(value: number, operator: ConditionOperator, threshold: number): boolean {
  switch (operator) {
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '==': return value === threshold;
    default: return false;
  }
}

function detectContradictions(outputs: Record<OutputKey, number>): ContradictionRule[] {
  const found = CONTRADICTION_RULES.filter((rule) =>
    rule.conditions.every(([key, operator, threshold]) => conditionMet(outputs[key], operator, threshold))
  );
  return [...found].sort((a, b) => b.severity - a.severity);
}

type MegaScore = {
  rawScore: number;
  contradictionPenalty: number;
  megaScore: number;
  band: string;
};

function calculateRawMegaScore(combined: Record<OutputKey, number>): number {
  let numerator = 0;
  let denominator = 0;
  for (const key of Object.keys(combined) as OutputKey[]) {
    const w = OUTPUT_WEIGHTS[key] ?? 1.0;
    numerator += combined[key] * w;
    denominator += w;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateContradictionPenalty(contradictions: ContradictionRule[]): number {
  return contradictions.slice(0, 3).reduce((sum, rule) => sum + rule.severity * 0.05, 0);
}

function calculateMegaScore(combined: Record<OutputKey, number>, contradictions: ContradictionRule[]): MegaScore {
  const raw = calculateRawMegaScore(combined);
  const penalty = calculateContradictionPenalty(contradictions);
  const final = clamp(raw - penalty);
  return {
    rawScore: Math.round(raw * 100) / 100,
    contradictionPenalty: Math.round(penalty * 100) / 100,
    megaScore: Math.round(final * 100) / 100,
    band: scoreBand(final),
  };
}

type PrimaryConstraint = {
  type: 'contradiction' | 'weakest_dimension';
  name: string;
  score: number | null;
  reason: string;
  intervention: string;
};

function identifyPrimaryConstraint(
  combined: Record<OutputKey, number>,
  contradictions: ContradictionRule[]
): PrimaryConstraint {
  if (contradictions.length > 0 && contradictions[0]!.severity >= 9) {
    const top = contradictions[0]!; // Non-null assertion: length checked
    return {
      type: 'contradiction',
      name: top.name,
      score: null,
      reason: top.statement,
      intervention: top.intervention,
    };
  }

  const keys = Object.keys(combined) as OutputKey[];
  const weakestKey = keys.reduce((a, b) => (combined[a] <= combined[b] ? a : b));
  const label = CURRENT_OUTPUTS[weakestKey as CurrentOutputKey]?.label
    ?? FUTURE_OUTPUTS[weakestKey as FutureOutputKey]?.label
    ?? weakestKey;

  return {
    type: 'weakest_dimension',
    name: label,
    score: Math.round(combined[weakestKey] * 100) / 100,
    reason: `This is currently the weakest derived dimension at ${combined[weakestKey].toFixed(2)} out of 10.`,
    intervention: INTERVENTION_MAP[weakestKey] ?? 'Strategic diagnosis',
  };
}

type Statement = {
  type: 'contradiction' | 'primary_constraint' | 'overall';
  severity: number;
  title: string;
  statement: string;
  recommendedDirection: string;
};

function generateStatements(
  combined: Record<OutputKey, number>,
  contradictions: ContradictionRule[],
  mega: MegaScore
): Statement[] {
  const statements: Statement[] = [];

  for (const rule of contradictions.slice(0, 5)) {
    statements.push({
      type: 'contradiction',
      severity: rule.severity,
      title: rule.name,
      statement: rule.statement,
      recommendedDirection: rule.intervention,
    });
  }

  const primary = identifyPrimaryConstraint(combined, contradictions);
  statements.push({
    type: 'primary_constraint',
    severity: 10,
    title: 'Primary Constraint',
    statement: primary.reason,
    recommendedDirection: primary.intervention,
  });

  let overall: string;
  if (mega.megaScore >= 8) {
    overall = 'The business shows strong overall capability. The key question is whether it can convert that capability into repeatable growth without creating new bottlenecks.';
  } else if (mega.megaScore >= 6) {
    overall = 'The business has a developing foundation, but several areas remain insufficiently resolved for confident scale.';
  } else if (mega.megaScore >= 4) {
    overall = 'The business has meaningful foundations but also material structural weaknesses that should be resolved before aggressive growth.';
  } else {
    overall = 'The business currently carries substantial unresolved uncertainty. The priority should be reducing the most important constraints before attempting aggressive expansion.';
  }

  statements.push({
    type: 'overall',
    severity: 0,
    title: 'Overall Assessment',
    statement: overall,
    recommendedDirection: 'Prioritised strategic intervention',
  });

  return statements;
}

export type DiagnosticResult = {
  inputs: Record<number, number>;
  current: Record<CurrentOutputKey, number>;
  future: Record<FutureOutputKey, number>;
  combined: Record<OutputKey, number>;
  contradictions: ContradictionRule[];
  mega: MegaScore;
  primaryConstraint: PrimaryConstraint;
  statements: Statement[];
};

function toRawInputs(answers: Record<string, number>): Record<number, number> {
  const inputs: Record<number, number> = {};
  for (const q of INPUT_NUMBERS) {
    const questionId = INPUT_SOURCE[q]!; // Non-null assertion: INPUT_NUMBERS derived from keys
    inputs[q] = clamp(answers[questionId] ?? 0);
  }
  return inputs;
}

function diagnose(answers: Record<string, number>): DiagnosticResult {
  const inputs = toRawInputs(answers);

  const current = {} as Record<CurrentOutputKey, number>;
  for (const key of Object.keys(CURRENT_FORMULAS) as CurrentOutputKey[]) {
    current[key] = Math.round(weightedAverageInputs(inputs, CURRENT_FORMULAS[key]) * 100) / 100;
  }

  const future = {} as Record<FutureOutputKey, number>;
  for (const key of Object.keys(FUTURE_FORMULAS) as FutureOutputKey[]) {
    future[key] = Math.round(weightedAverageInputs(inputs, FUTURE_FORMULAS[key]) * 100) / 100;
  }

  const combined = { ...current, ...future } as Record<OutputKey, number>;
  const contradictions = detectContradictions(combined);
  const mega = calculateMegaScore(combined, contradictions);
  const primaryConstraint = identifyPrimaryConstraint(combined, contradictions);
  const statements = generateStatements(combined, contradictions, mega);

  return { inputs, current, future, combined, contradictions, mega, primaryConstraint, statements };
}

// ─── Client resolution ────────────────────────────────────────────────────

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
  leadMagnetTypes: LeadMagnetType[];
  latestSubmission: {
    leadMagnet: LeadMagnetType;
    founderName: string;
    companyName: string;
    createdAt: Date;
  } | null;
}

export interface GetAdminLeadsListOptions {
  status?: 'new' | 'old';
  search?: string;
  leadMagnetType?: LeadMagnetType;
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
    result: DiagnosticResult;
  }> {
    const { clientId, isNewClient } = await resolveClient(email);
    const result = diagnose(answers as Record<string, number>); // safe cast

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
      megaScore: result.mega.megaScore,
    });

    return {
      submissionId: submission._id.toString(),
      clientStatus: isNewClient ? 'new' : 'existing',
      result,
    };
  },

  // ── Admin methods ──────────────────────────────────────────────────────

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

  async getClientSubmissions(clientId: string): Promise<ILeadMagnetSubmission[]> {
    const client = await Client.findById(clientId);
    if (!client) throw new AppError('Lead not found', 404);

    return LeadMagnetSubmission.find({ clientId }).sort({ createdAt: -1 });
  },

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