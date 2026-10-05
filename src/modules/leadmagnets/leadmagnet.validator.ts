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

// ─── Founder profile (capture-only, but MANDATORY) ───────────────────────────
// The extra cards shown after the 15 scored questions. Stored as-is, never fed
// into scoring. Every card is mandatory on the frontend, and this schema
// enforces the same rules server-side so a direct API call can't skip them:
//   - capital, time, "raised funds?", problems and next goal must be answered
//   - if raisedFunds is true: source and amount are required, and so is the
//     free-text when the source is "Other"
//   - at least one help area must be selected
// Category labels (capital/time/source/amount) are still length-limited strings
// rather than a fixed enum, so rewording a dropdown label on the frontend can't
// cause valid leads to be rejected — see PROFILE_LIMITS in constants.ts.
// Unknown keys are dropped rather than rejected.
const requiredCategory = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(PROFILE_LIMITS.category, 'A profile answer is too long');

const optionalCategory = z
  .string({ error: 'Invalid profile answer' })
  .trim()
  .max(PROFILE_LIMITS.category, 'A profile answer is too long')
  .nullable()
  .optional();

// { customer?: boolean, market?: boolean, ... } — unknown keys are stripped,
// and the transform below fills every missing area with false.
const helpAreasSchema = z.object(
  Object.fromEntries(HELP_AREA_KEYS.map((key) => [key, z.boolean().optional()])),
  { error: 'Please select at least one area where you need help' }
);

const requiredLongText = (message: string, tooLong: string) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(PROFILE_LIMITS.longText, tooLong);

export const founderProfileSchema = z
  .object(
    {
      capitalInvested: requiredCategory('Please select how much capital you have invested'),
      timeInvested: requiredCategory('Please select how much time you have invested'),
      raisedFunds: z.boolean({ error: 'Please tell us whether you have raised initial funds' }),
      fundingSource: optionalCategory,
      fundingSourceOther: z
        .string({ error: 'Invalid profile answer' })
        .trim()
        .max(PROFILE_LIMITS.fundingSourceOther, 'The funding source is too long')
        .optional(),
      fundingAmount: optionalCategory,
      helpAreas: helpAreasSchema,
      problems: requiredLongText(
        'Please describe the problems you are facing',
        `Problems description must be ${PROFILE_LIMITS.longText} characters or fewer`
      ),
      nextFinancialGoal: requiredLongText(
        'Please tell us your next financial goal',
        `Financial goal must be ${PROFILE_LIMITS.longText} characters or fewer`
      ),
    },
    { error: 'Please refresh the page and answer all the questions to continue' }
  )
  // Cross-field rules (these only run once every field above is well-formed).
  .superRefine((p, ctx) => {
    if (!HELP_AREA_KEYS.some((key) => p.helpAreas[key] === true)) {
      ctx.addIssue({
        code: 'custom',
        path: ['helpAreas'],
        message: 'Please select at least one area where you need help',
      });
    }

    if (p.raisedFunds === true) {
      if (!p.fundingSource) {
        ctx.addIssue({
          code: 'custom',
          path: ['fundingSource'],
          message: 'Please tell us where the funds came from',
        });
      }
      if (p.fundingSource === 'Other' && !p.fundingSourceOther) {
        ctx.addIssue({
          code: 'custom',
          path: ['fundingSourceOther'],
          message: 'Please tell us the source of the funds',
        });
      }
      if (!p.fundingAmount) {
        ctx.addIssue({
          code: 'custom',
          path: ['fundingAmount'],
          message: 'Please tell us how much you have raised',
        });
      }
    }
  })
  // Normalise into one predictable shape before it reaches the service/DB:
  //  - funding details only survive when raisedFunds is true
  //  - "other" text only survives when the source is "Other"
  //  - every help area is present as a real boolean (false = not selected)
  .transform((p) => {
    const fundingSource = p.raisedFunds ? p.fundingSource || null : null;
    const helpAreas = Object.fromEntries(
      HELP_AREA_KEYS.map((key) => [key, p.helpAreas[key] === true])
    ) as Record<(typeof HELP_AREA_KEYS)[number], boolean>;

    return {
      capitalInvested: p.capitalInvested,
      timeInvested: p.timeInvested,
      raisedFunds: p.raisedFunds,
      fundingSource,
      fundingSourceOther: fundingSource === 'Other' ? p.fundingSourceOther || '' : '',
      fundingAmount: p.raisedFunds ? p.fundingAmount || null : null,
      helpAreas,
      problems: p.problems,
      nextFinancialGoal: p.nextFinancialGoal,
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

  // NEW (v4): founder profile — capture-only (never scored) but MANDATORY.
  // A browser still running the older frontend sends no profile and is
  // rejected with a "please refresh" message. Has no effect on `answers`
  // validation or on scoring.
  profile: founderProfileSchema,
});

export type SubmitBusinessHeatMapInput = z.infer<typeof submitBusinessHeatMapSchema>;