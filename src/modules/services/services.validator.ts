import { z } from 'zod';

const checklistStepSchema = z.object({
  stepId: z.string().min(1, 'stepId is required'),
  title:  z.string().min(1, 'Step title is required'),
  order:  z.number().int().min(1, 'Order must be a positive integer'),
});

// 1. Define the service types as a constant array (Single Source of Truth)
export const SERVICE_TYPES = ['service', 'cohort'] as const;

export const createServiceSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title is too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description is too long'),
  price: z
    // FIX: Replaced 'invalid_type_error' with 'message'
    .number({ message: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
  // FIX: Passed the constant array and used 'message' instead of errorMap
  type: z.enum(SERVICE_TYPES, {
    message: `Type must be either ${SERVICE_TYPES.join(' or ')}`,
  }),
  defaultChecklist: z
    .array(checklistStepSchema)
    .default([]),
});

export const updateServiceSchema = z.object({
  title:           z.string().min(1).max(200).optional(),
  description:     z.string().min(1).max(5000).optional(),
  price:           z.number().min(0).optional(),
  defaultChecklist: z.array(checklistStepSchema).optional(),
});

export const updateServiceStatusSchema = z.object({
  // FIX: Replaced 'invalid_type_error' with 'message'
  isActive: z.boolean({ message: 'isActive must be a boolean' }),
});

// Export the standalone ServiceType for use in your frontend or database schemas
export type ServiceType = typeof SERVICE_TYPES[number];

export type CreateServiceInput       = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput       = z.infer<typeof updateServiceSchema>;
export type UpdateServiceStatusInput = z.infer<typeof updateServiceStatusSchema>;