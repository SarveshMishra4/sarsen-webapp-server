import { z } from 'zod';

export const submitFeedbackSchema = z.object({
  rating: z
.number({ message: 'Rating must be a number' })    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comments: z
    .string()
    .max(5000, 'Comments are too long')
    .optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
