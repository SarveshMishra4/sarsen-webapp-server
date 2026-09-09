import { z } from 'zod';
import {
  DESCRIBES_YOU_OPTIONS,
  BUSINESS_STAGE_OPTIONS,
  UNCERTAINTY_OPTIONS,
} from './report-interest.model.js';

export const submitReportInterestSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name is too long'),

  email: z.string().email('Invalid email address'),

  phone: z
    .string()
    .min(6, 'Phone number is too short')
    .max(20, 'Phone number is too long'),

  describesYou: z.enum(DESCRIBES_YOU_OPTIONS, {
    message: `describesYou must be one of: ${DESCRIBES_YOU_OPTIONS.join(', ')}`,
  }),

  businessStage: z.enum(BUSINESS_STAGE_OPTIONS, {
    message: `businessStage must be one of: ${BUSINESS_STAGE_OPTIONS.join(', ')}`,
  }),

  uncertainty: z.enum(UNCERTAINTY_OPTIONS, {
    message: `uncertainty must be one of: ${UNCERTAINTY_OPTIONS.join(', ')}`,
  }),
});

export type SubmitReportInterestInput = z.infer<typeof submitReportInterestSchema>;
