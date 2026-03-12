import mongoose from 'mongoose';
import { FileReference, IFileReference } from './fileReference.model.js';
import { Engagement } from '../engagements/engagement.model.js';
import { AppError } from '../../core/errors/AppError.js';
import { logger } from '../../core/logger/logger.js';

export const fileReferenceService = {

  /**
   * attachFile
   *
   * Admin attaches an external file URL to an engagement.
   * No file is uploaded — only the URL and metadata are stored.
   * The engagement must exist; no status restriction (files can be
   * attached at any point including after delivery for reference).
   */
  async attachFile(
    engagementId: string,
    adminId: string,
    data: { fileName: string; fileUrl: string; fileType: string }
  ): Promise<IFileReference> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    const fileRef = await FileReference.create({
      engagementId,
      fileName:   data.fileName,
      fileUrl:    data.fileUrl,
      fileType:   data.fileType,
      uploadedBy: adminId,
    });

    logger.info('[Files] File reference attached', {
      engagementId,
      fileName: data.fileName,
      fileType: data.fileType,
      adminId,
    });

    return fileRef;
  },

  /**
   * getFiles
   *
   * Returns all file references attached to an engagement.
   * Accessible by the engagement owner (user) and any admin.
   * Ownership enforced for users — 403 if not their engagement.
   */
  async getFiles(
    engagementId: string,
    requesterId: string,
    requesterRole: 'user' | 'admin'
  ): Promise<IFileReference[]> {
    if (!mongoose.Types.ObjectId.isValid(engagementId)) {
      throw new AppError('Invalid engagement ID', 400);
    }

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new AppError('Engagement not found', 404);

    if (requesterRole === 'user' && engagement.userId.toString() !== requesterId) {
      throw new AppError('You do not have access to this engagement', 403);
    }

    return FileReference.find({ engagementId }).sort({ createdAt: -1 });
  },
};
