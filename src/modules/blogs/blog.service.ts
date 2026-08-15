import slugify from 'slugify';
import sanitizeHtml from 'sanitize-html';
import { Blog, IBlog } from './blog.model.js';
import { SANITIZE_ALLOWED_TAGS, SANITIZE_ALLOWED_ATTRIBUTES } from './blog.constants.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

const WORDS_PER_MINUTE = 200;

// The actual security boundary — applied on every write regardless of what
// the admin's editor produced. Never trust HTML just because it came from
// an authenticated admin session.
function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: SANITIZE_ALLOWED_TAGS,
    allowedAttributes: SANITIZE_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}

function computeReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

async function generateUniqueSlug(
  title: string,
  preferredSlug?: string,
  excludeId?: string
): Promise<string> {
  const base = slugify(preferredSlug || title, { lower: true, strict: true });
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-await-in-loop
  while (
    await Blog.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

// SEO fields fall back to the underlying content fields at READ time (not
// storage time), so editing the title/excerpt/cover later keeps SEO in sync
// unless the admin has explicitly typed an override into the SEO fields.
function withSeoDefaults(blog: IBlog) {
  const obj: any = typeof (blog as any).toObject === 'function' ? (blog as any).toObject() : blog;
  return {
    ...obj,
    seoTitle: obj.seoTitle || obj.title,
    seoDescription: obj.seoDescription || obj.excerpt,
    seoOgImage: obj.seoOgImage || obj.coverImageUrl,
    canonicalUrl: obj.canonicalUrl || `/blog/${obj.slug}`,
  };
}

export const blogService = {

  async createBlog(data: any): Promise<IBlog> {
    const slug = await generateUniqueSlug(data.title, data.slug);
    const content = sanitizeContent(data.content);

    const blog = await Blog.create({
      ...data,
      slug,
      content,
      readTimeMinutes: data.readTimeMinutes || computeReadTime(content),
      status: 'draft',
    });

    logger.info('[Blogs] Draft created', { blogId: blog._id.toString(), slug });
    return blog;
  },

  async updateBlog(id: string, data: any): Promise<IBlog> {
    const blog = await Blog.findById(id);
    if (!blog) throw new AppError('Blog post not found', 404);

    // Slug lock: once published, the slug is immutable. Before publish it
    // can move freely, including being regenerated from a new title.
    if (blog.status === 'published' && data.slug && data.slug !== blog.slug) {
      throw new AppError('Slug cannot be changed after a post has been published', 400);
    }

    const updates: any = { ...data };

    if (data.slug || data.title) {
      updates.slug =
        blog.status === 'published'
          ? blog.slug
          : await generateUniqueSlug(data.title || blog.title, data.slug, id);
    }

    if (data.content) {
      updates.content = sanitizeContent(data.content);
      if (!data.readTimeMinutes) {
        updates.readTimeMinutes = computeReadTime(updates.content);
      }
    }

    Object.assign(blog, updates);
    await blog.save();

    logger.info('[Blogs] Blog updated', { blogId: id });
    return blog;
  },

  async publishBlog(id: string): Promise<IBlog> {
    const blog = await Blog.findById(id);
    if (!blog) throw new AppError('Blog post not found', 404);

    blog.status = 'published';
    if (!blog.publishedAt) blog.publishedAt = new Date();
    await blog.save();

    logger.info('[Blogs] Blog published', { blogId: id, slug: blog.slug });
    return blog;
  },

  async unpublishBlog(id: string): Promise<IBlog> {
    const blog = await Blog.findById(id);
    if (!blog) throw new AppError('Blog post not found', 404);

    blog.status = 'draft';
    await blog.save();

    logger.info('[Blogs] Blog moved to draft', { blogId: id });
    return blog;
  },

  async deleteBlog(id: string): Promise<void> {
    const blog = await Blog.findByIdAndDelete(id);
    if (!blog) throw new AppError('Blog post not found', 404);
    logger.info('[Blogs] Blog deleted', { blogId: id });
  },

  async getAdminList(): Promise<IBlog[]> {
    return Blog.find().sort({ createdAt: -1 });
  },

  async getAdminById(id: string): Promise<IBlog> {
    const blog = await Blog.findById(id);
    if (!blog) throw new AppError('Blog post not found', 404);
    return blog;
  },

  async getPublishedList(opts: {
    tag?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    blogs: ReturnType<typeof withSeoDefaults>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 25));
    const filter: any = { status: 'published' };
    if (opts.tag && opts.tag !== 'All') filter.tag = opts.tag;

    const [docs, total] = await Promise.all([
      Blog.find(filter)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    return { blogs: docs.map(withSeoDefaults), total, page, limit };
  },

  async getPublishedBySlug(slug: string) {
    const blog = await Blog.findOne({ slug, status: 'published' });
    if (!blog) throw new AppError('Blog post not found', 404);
    return withSeoDefaults(blog);
  },
};