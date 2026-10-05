import { z } from 'zod';
import { QUESTION_IDS, ANSWER_SCALE_VALUES, HELP_AREA_KEYS, PROFILE_LIMITS } from './leadmagnet.constants.js';

// Each answer must be exactly one of the frontend's discrete answer values
// (0, 1, 4, 7, 10) — where 0 means "I don't know / haven't looked into this".
// Not any integer 0-10 like the old continuous scale.
// z.literal union enforces that precisely and gives a clear error message.
const answerValueSchema = z.union(
  ANSWER_SCALE_VALUES.map((v) => z.literal(v)),
  { error: `Answer must be one of: ${ANSWER_SCALE_VALUES.join(', ')}` }
);

// Build { q1: answerValueSchema, q2: ..., ... } from QUESTION_IDS so we never
// have to hand-maintain the list, and it stays in sync with constants.ts.
const answerFieldShape = Object.fromEntries(
  QUESTION_IDS.map((id) => [id, answerValueSchema])
);

// .strict() rejects payloads with extra/unknown keys, and z.object requires every
// key to be present by default — so this enforces "exactly these 15 questions,
// all answered, nothing else."
const businessHeatMapAnswersSchema = z.object(answerFieldShape).strict();

// ─── Founder profile (capture-only) ──────────────────────────────────────────
// The extra cards shown after the 15 scored questions. Stored as-is, never fed
// into scoring. Deliberately lenient: the whole object is optional (a browser
// still running the older frontend sends none), unknown keys are dropped rather
// than rejected, and category labels are length-limited strings rather than a
// fixed enum — see PROFILE_LIMITS in constants.ts for why.
const categoryField = z
  .string({ error: 'Invalid profile answer' })
  .trim()
  .max(PROFILE_LIMITS.category, 'A profile answer is too long')
  .nullable()
  .optional();

// { customer?: boolean, market?: boolean, ... } — unknown keys are stripped,
// and the transform below fills every missing area with false.
const helpAreasSchema = z.object(
  Object.fromEntries(HELP_AREA_KEYS.map((key) => [key, z.boolean().optional()]))
);

export const founderProfileSchema = z
  .object({
    capitalInvested: categoryField,
    timeInvested: categoryField,
    raisedFunds: z.boolean({ error: 'Invalid profile answer' }).nullable().optional(),
    fundingSource: categoryField,
    fundingSourceOther: z
      .string({ error: 'Invalid profile answer' })
      .trim()
      .max(PROFILE_LIMITS.fundingSourceOther, 'The funding source is too long')
      .optional(),
    fundingAmount: categoryField,
    helpAreas: helpAreasSchema.optional(),
    problems: z
      .string({ error: 'Invalid profile answer' })
      .trim()
      .max(PROFILE_LIMITS.longText, `Problems description must be ${PROFILE_LIMITS.longText} characters or fewer`)
      .optional(),
    nextFinancialGoal: z
      .string({ error: 'Invalid profile answer' })
      .trim()
      .max(PROFILE_LIMITS.longText, `Financial goal must be ${PROFILE_LIMITS.longText} characters or fewer`)
      .optional(),
  })
  // Normalise into one predictable shape before it reaches the service/DB:
  //  - funding details only survive when raisedFunds is explicitly true
  //  - "other" text only survives when the source is "Other"
  //  - every help area is present as a real boolean (false = not selected)
  .transform((p) => {
    const raisedFunds = p.raisedFunds === true ? true : p.raisedFunds === false ? false : null;
    const fundingSource = raisedFunds === true ? p.fundingSource || null : null;
    const helpAreas = Object.fromEntries(
      HELP_AREA_KEYS.map((key) => [key, p.helpAreas?.[key] === true])
    ) as Record<(typeof HELP_AREA_KEYS)[number], boolean>;

    return {
      capitalInvested: p.capitalInvested || null,
      timeInvested: p.timeInvested || null,
      raisedFunds,
      fundingSource,
      fundingSourceOther: fundingSource === 'Other' ? p.fundingSourceOther || '' : '',
      fundingAmount: raisedFunds === true ? p.fundingAmount || null : null,
      helpAreas,
      problems: p.problems || '',
      nextFinancialGoal: p.nextFinancialGoal || '',
    };
  });

export type FounderProfileInput = z.infer<typeof founderProfileSchema>;

export const submitBusinessHeatMapSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),

  // NEW (v2): previously optional, now required — the intro form on the
  // frontend blocks submission until this is filled in.
  founderName: z
    .string({ error: 'Founder name is required' })
    .trim()
    .min(1, 'Founder name is required')
    .max(200, 'Founder name is too long'),

  // CHANGED (v2): was optional in v1, now required.
  companyName: z
    .string({ error: 'Business name is required' })
    .trim()
    .min(1, 'Business name is required')
    .max(200, 'Business name is too long'),

  // NEW (v2): sector/domain, required.
  industry: z
    .string({ error: 'Sector or domain is required' })
    .trim()
    .min(1, 'Sector or domain is required')
    .max(200, 'Sector or domain is too long'),

  answers: businessHeatMapAnswersSchema,

  // NEW (v4): capture-only founder profile. Optional so older cached frontends
  // keep working. Has no effect on `answers` validation or on scoring.
  profile: founderProfileSchema.optional(),
});

export type SubmitBusinessHeatMapInput = z.infer<typeof submitBusinessHeatMapSchema>;