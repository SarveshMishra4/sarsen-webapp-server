import { z } from 'zod';

export const attachFileSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name is too long'),
  fileUrl: z
    .string()
    .url('fileUrl must be a valid URL'),
  fileType: z
    .string()
    .min(1, 'File type is required')
    .max(50, 'File type is too long'),
});

export type AttachFileInput = z.infer<typeof attachFileSchema>;
