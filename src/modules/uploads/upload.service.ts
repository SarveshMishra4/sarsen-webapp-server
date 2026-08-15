import { cloudinary } from './upload.config.js';
import { UPLOAD_FOLDERS, UploadFolder } from '../blogs/blog.constants.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

export const uploadService = {

  /**
   * Uploads an in-memory image buffer (from multer) to Cloudinary under
   * blogs/{folder}. `folder` is validated against a fixed allowlist so this
   * endpoint can never be used to write into an arbitrary Cloudinary path.
   */
  async uploadImage(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
    if (!UPLOAD_FOLDERS.includes(folder as UploadFolder)) {
      throw new AppError(`Invalid upload folder: ${folder}`, 400);
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `blogs/${folder}`, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            logger.error('[Uploads] Cloudinary upload failed', { error });
            reject(new AppError('Image upload failed', 500));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  },
};
