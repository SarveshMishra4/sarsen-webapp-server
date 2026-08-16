import { z } from 'zod';
import { BLOG_TAGS } from './blog.constants.js';

const blogImageSchema = z.object({
  url: z.string().url('Image url must be valid'),
  altText: z.string().max(200).optional(),
  order: z.number().int().min(0).default(0),
});

const reportSchema = z.object({
  mockupImageUrl: z.string().url('Report mockup image must be a valid URL'),
  name: z.string().min(1, 'Report name is required').max(200),
  description: z.string().min(1, 'Report description is required'),
  authors: z
    .array(z.string().min(1))
    .min(1, 'At least one author is required')
    .max(3, 'At most 3 authors allowed'),
  releaseDate: z.string().or(z.date()),
});

export const createBlogSchema = z.object({
  title: z.string({ error: 'Title is required' }).min(1).max(300),
  // Manual slug override at creation time. If omitted, the service
  // generates one from the title.
  slug: z.string().min(1).max(300).optional(),
  excerpt: z.string({ error: 'Excerpt is required' }).min(1).max(500),
  content: z.string({ error: 'Content is required' }).min(1),
  tag: z.enum(BLOG_TAGS, { error: 'A valid tag is required' }),
  keywords: z.array(z.string().min(1).max(60)).max(20).optional(),
  coverImageUrl: z.string({ error: 'Cover image is required' }).url('Cover image must be a valid URL'),
  authorName: z.string({ error: 'Author name is required' }).min(1).max(200),
  authorTitle: z.string().max(200).optional(),
  authorImageUrl: z.string().url().optional(),
  authorBio: z.string().max(300).optional(),
  readTimeMinutes: z.number().int().min(1).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  seoOgImage: z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
  images: z.array(blogImageSchema).optional(),
  report: reportSchema.optional(),
  relatedPosts: z.array(z.string()).max(5, 'At most 5 related posts allowed').optional(),
});

// Same shape, everything optional (including slug — the service layer is
// what actually enforces the "locked after publish" rule; the validator's
// job is only to check the shape of whatever fields were sent).
export const updateBlogSchema = createBlogSchema.partial();

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
