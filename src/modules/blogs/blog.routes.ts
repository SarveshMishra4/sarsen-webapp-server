import { Router } from 'express';
import { blogController } from './blog.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const router = Router();

// ─── Admin Routes (protected) ─────────────────────────────────────────────
// IMPORTANT: these must be registered BEFORE the public '/:slug' route
// below, or Express will try to match "admin" as a slug value.

router.get('/admin', requireAdmin, blogController.getAdminList);
router.get('/admin/search', requireAdmin, blogController.searchForRelatedPosts);
router.post('/admin', requireAdmin, blogController.createBlog);
router.patch('/admin/:id', requireAdmin, blogController.updateBlog);
router.post('/admin/:id/publish', requireAdmin, blogController.publishBlog);
router.post('/admin/:id/unpublish', requireAdmin, blogController.unpublishBlog);
router.delete('/admin/:id', requireAdmin, blogController.deleteBlog);

// ─── Public Routes ─────────────────────────────────────────────────────────

// GET /blogs?tag=&page=&limit= — published only, paginated
router.get('/', blogController.getPublishedList);

// GET /blogs/:slug — published only, single post
router.get('/:slug', blogController.getPublishedBySlug);

export default router;
