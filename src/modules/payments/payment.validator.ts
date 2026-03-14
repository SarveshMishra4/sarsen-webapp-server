import { z } from 'zod';

export const createOrderSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  userEmail: z.string().email('A valid email is required'),
  couponCode: z.string().optional(),
  purchaseAnswers: z
    .array(
      z.object({
        questionId:   z.string(),
        questionText: z.string(),
        answer:       z.string(),
      })
    )
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;