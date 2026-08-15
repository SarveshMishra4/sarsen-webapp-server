import { Router } from 'express';
import multer from 'multer';
import { uploadController } from './upload.controller.js';
import { requireAdmin } from '../../core/middleware/requireAdmin.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

// POST /uploads/image — admin only. multipart/form-data: { file, folder }
// folder must be one of: blog-covers | blog-gallery | blog-authors | blog-reports
router.post('/image', requireAdmin, upload.single('file'), uploadController.uploadImage);

export default router;
