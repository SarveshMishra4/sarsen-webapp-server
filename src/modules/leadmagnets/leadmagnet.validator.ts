import { z } from 'zod';
import { QUESTION_IDS } from './leadmagnet.constants.js';

// Build { q1: z.number().int().min(1).max(10), q2: ..., ... } from QUESTION_IDS
// so we never have to hand-maintain 22 lines, and it stays in sync with constants.ts.
const answerFieldShape = Object.fromEntries(
  QUESTION_IDS.map((id) => [
    id,
    z
      .number({ error: `${id} must be a number` })
      .int(`${id} must be a whole number`)
      .min(1, `${id} must be between 1 and 10`)
      .max(10, `${id} must be between 1 and 10`),
  ])
);

// .strict() rejects payloads with extra/unknown keys, and z.object requires every
// key to be present by default — so this enforces "exactly these 22 questions,
// all answered, nothing else."
const businessHeatMapAnswersSchema = z.object(answerFieldShape).strict();

export const submitBusinessHeatMapSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  companyName: z
    .string()
    .trim()
    .max(200, 'Company name is too long')
    .optional(),
  answers: businessHeatMapAnswersSchema,
});

export type SubmitBusinessHeatMapInput = z.infer<typeof submitBusinessHeatMapSchema>;
