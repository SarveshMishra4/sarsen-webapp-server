import { apiRequest } from './api';

// ─── Payload shapes (what we SEND to the backend) ──────────────────────────

export interface BlogImagePayload {
  url: string;
  altText?: string;
  order: number;
}

export interface BlogReportPayload {
  mockupImageUrl: string;
  name: string;
  description: string;
  authors: string[];
  releaseDate: string;
}

export interface BlogPayload {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  tag: string;
  keywords?: string[];
  coverImageUrl: string;
  authorName: string;
  authorTitle?: string;
  authorImageUrl?: string;
  readTimeMinutes?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  canonicalUrl?: string;
  images?: BlogImagePayload[];
  report?: BlogReportPayload;
}

// ─── Admin ──────────────────────────────────────────────────────────────

export const getAllBlogsAdmin = (token: string) =>
  apiRequest<{ blogs: any[]; total: number }>('GET', '/blogs/admin', { token });

export const createBlog = (data: BlogPayload, token: string) =>
  apiRequest<{ blog: any }>('POST', '/blogs/admin', { body: data, token });

export const updateBlog = (id: string, data: Partial<BlogPayload>, token: string) =>
  apiRequest<{ blog: any }>('PATCH', `/blogs/admin/${id}`, { body: data, token });

export const publishBlog = (id: string, token: string) =>
  apiRequest<{ blog: any }>('POST', `/blogs/admin/${id}/publish`, { token });

export const unpublishBlog = (id: string, token: string) =>
  apiRequest<{ blog: any }>('POST', `/blogs/admin/${id}/unpublish`, { token });

export const deleteBlog = (id: string, token: string) =>
  apiRequest<{}>('DELETE', `/blogs/admin/${id}`, { token });

/**
 * Image upload is multipart/form-data, which doesn't fit apiRequest's
 * JSON-body assumption used everywhere else in this file — so it goes
 * through fetch() directly.
 *
 * ⚠️ VERIFY BEFORE USE: this assumes an env var NEXT_PUBLIC_API_URL holds
 * your API base URL, and that the backend accepts the admin JWT as a
 * Bearer token in the Authorization header. Check services/api.ts (the
 * apiRequest implementation) and adjust both of those if it does it
 * differently — e.g. a different env var name, or a custom header.
 */
export const uploadBlogImage = async (
  file: File,
  folder: 'blog-covers' | 'blog-gallery' | 'blog-authors' | 'blog-reports',
  token: string
): Promise<{ url: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/uploads/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Image upload failed');
  }

  const json = await res.json();
  return json.data;
};

// ─── Public ─────────────────────────────────────────────────────────────

export const getPublishedBlogs = (params?: { tag?: string; page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.tag && params.tag !== 'All') query.set('tag', params.tag);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();

  return apiRequest<{ blogs: any[]; total: number; page: number; limit: number }>(
    'GET',
    `/blogs${qs ? `?${qs}` : ''}`,
    {}
  );
};

export const getBlogBySlug = (slug: string) =>
  apiRequest<{ blog: any }>('GET', `/blogs/${slug}`, {});
