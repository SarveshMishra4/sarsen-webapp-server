import { z } from 'zod';

export const submitContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long'),
});

// 1. Define the statuses as a constant array for a single source of truth
export const CONTACT_STATUSES = ['new', 'in_progress', 'resolved', 'ignored'] as const;

export const updateStatusSchema = z.object({
  // 2. Pass the array into z.enum and use the 'message' property
  status: z.enum(CONTACT_STATUSES, {
    message: `Status must be one of: ${CONTACT_STATUSES.join(', ')}`,
  }),
});

export const addNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000, 'Note is too long'),
});

// 3. Export the standalone Status type for use elsewhere in your app
export type ContactStatus = typeof CONTACT_STATUSES[number];

export type SubmitContactInput = z.infer<typeof submitContactSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;