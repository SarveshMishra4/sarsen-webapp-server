import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
