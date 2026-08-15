/**
 * blog.constants.ts
 *
 * Single source of truth for the blog tag enum (the one colored badge shown
 * on every post) and the sanitize-html allowlist applied to `content` on
 * every create/update. Bold, links, and tables only — nothing else is
 * permitted through, regardless of what the rich text editor emits.
 */

export const BLOG_TAGS = [
  'Strategy',
  'Revenue',
  'Finance',
  'Metrics',
  'PMF',
  'Operations',
  'Thinking',
  'Fundraising',
  'Customers',
  'Advisory',
  'Product',
] as const;

export type BlogTag = (typeof BLOG_TAGS)[number];

export const BLOG_STATUSES = ['draft', 'published'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

// sanitize-html config — applied server-side on every write, regardless of
// what the admin's rich text editor produced. This is the actual security
// boundary; the editor's toolbar restrictions are just UX, not enforcement.
export const SANITIZE_ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

export const SANITIZE_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
};

export const UPLOAD_FOLDERS = [
  'blog-covers',
  'blog-gallery',
  'blog-authors',
  'blog-reports',
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
