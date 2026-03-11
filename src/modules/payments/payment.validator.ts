import { z } from 'zod';

export const createOrderSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  userEmail: z.string().email('A valid email is required'),
  couponCode: z.string().optional(),
  purchaseAnswers: z
    .array(
      z.object({
        questionKey:   z.string().min(1, 'questionKey is required'),
        questionLabel: z.string().min(1, 'questionLabel is required'),
        answer:        z.string().min(1, 'answer cannot be empty'),
      })
    )
    .optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
