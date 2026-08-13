import { z } from 'zod';
import { QUESTION_IDS, ANSWER_SCALE_VALUES } from './leadmagnet.constants.js';

// Each answer must be exactly one of the frontend's discrete scale values
// (1, 3, 5, 7, 10) — not any integer 1-10 like the old continuous scale.
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
});

export type SubmitBusinessHeatMapInput = z.infer<typeof submitBusinessHeatMapSchema>;