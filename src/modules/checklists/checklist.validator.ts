import { z } from 'zod';

export const toggleStepSchema = z.object({
  isCompleted: z.boolean({ invalid_type_error: 'isCompleted must be a boolean' }),
});

export const updateChecklistSchema = z.object({
  steps: z
    .array(
      z.object({
        stepId: z.string().min(1, 'stepId is required'),
        title:  z.string().min(1, 'Step title is required').max(300, 'Title is too long'),
        order:  z.number().int().min(1, 'order must be a positive integer'),
      })
    )
    .min(1, 'Checklist must have at least one step'),
});

export type ToggleStepInput      = z.infer<typeof toggleStepSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
