import { z } from 'zod';

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Used by the test endpoint for resolveOrCreateUser
export const resolveUserSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type LoginInput       = z.infer<typeof loginSchema>;
export type ResolveUserInput = z.infer<typeof resolveUserSchema>;
