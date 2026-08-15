import { Request, Response, NextFunction } from 'express';
import { uploadService } from './upload.service.js';
import { formatResponse } from '../../core/utils/formatResponse.js';
import { AppError } from '../../core/errors/AppError.js';

export const uploadController = {

  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) throw new AppError('No image file provided', 400);

      const folder = typeof req.body.folder === 'string' ? req.body.folder : 'blog-covers';
      const result = await uploadService.uploadImage(file.buffer, folder);

      res.status(201).json(formatResponse(true, 'Image uploaded.', result));
    } catch (err) {
      next(err);
    }
  },
};
