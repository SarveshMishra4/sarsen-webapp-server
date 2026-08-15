import { Request, Response, NextFunction } from 'express';
import { blogService } from './blog.service.js';
import { createBlogSchema, updateBlogSchema } from './blog.validator.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const blogController = {

  // ── Admin ──────────────────────────────────────────────────────────────

  async createBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createBlogSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }
      const blog = await blogService.createBlog(parsed.data);
      res.status(201).json(formatResponse(true, 'Blog draft created.', { blog }));
    } catch (err) {
      next(err);
    }
  },

  async updateBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateBlogSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.issues[0]?.message || 'Invalid input', 400);
      }
      const blog = await blogService.updateBlog(req.params.id as string, parsed.data);
      res.status(200).json(formatResponse(true, 'Blog updated.', { blog }));
    } catch (err) {
      next(err);
    }
  },

  async publishBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blog = await blogService.publishBlog(req.params.id as string);
      res.status(200).json(formatResponse(true, 'Blog published.', { blog }));
    } catch (err) {
      next(err);
    }
  },

  async unpublishBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blog = await blogService.unpublishBlog(req.params.id as string);
      res.status(200).json(formatResponse(true, 'Blog moved to draft.', { blog }));
    } catch (err) {
      next(err);
    }
  },

  async deleteBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await blogService.deleteBlog(req.params.id as string);
      res.status(200).json(formatResponse(true, 'Blog deleted.', {}));
    } catch (err) {
      next(err);
    }
  },

  async getAdminList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blogs = await blogService.getAdminList();
      res.status(200).json(formatResponse(true, 'Blogs retrieved.', { blogs, total: blogs.length }));
    } catch (err) {
      next(err);
    }
  },

  // ── Public ─────────────────────────────────────────────────────────────

  async getPublishedList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const result = await blogService.getPublishedList({ tag, page, limit });
      res.status(200).json(formatResponse(true, 'Blogs retrieved.', result));
    } catch (err) {
      next(err);
    }
  },

  async getPublishedBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const blog = await blogService.getPublishedBySlug(req.params.slug as string);
      res.status(200).json(formatResponse(true, 'Blog retrieved.', { blog }));
    } catch (err) {
      next(err);
    }
  },
};
