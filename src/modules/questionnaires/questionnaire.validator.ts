import { z } from 'zod';

export const createQuestionnaireSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title is too long'),
  deadline: z
    .string()
    .datetime({ message: 'deadline must be a valid ISO 8601 date string' }),
});

export const addQuestionSchema = z.object({
  text: z
    .string()
    .min(1, 'Question text is required')
    .max(1000, 'Question text is too long'),
  order: z
.number({ message: 'order must be a number' })    .int()
    .min(1, 'order must be a positive integer'),
});

export const submitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1, 'questionId is required'),
        answerText: z.string().min(1, 'Answer cannot be empty'),
      })
    )
    .min(1, 'At least one answer is required'),
});

export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireSchema>;
export type AddQuestionInput         = z.infer<typeof addQuestionSchema>;
export type SubmitAnswersInput       = z.infer<typeof submitAnswersSchema>;
