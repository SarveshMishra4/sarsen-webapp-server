import mongoose, { Document, Schema } from 'mongoose';

export interface IFileReference extends Document {
  engagementId: mongoose.Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string; // adminId — stored for audit trail
  createdAt: Date;
  updatedAt: Date;
}

const FileReferenceSchema = new Schema<IFileReference>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const FileReference = mongoose.model<IFileReference>(
  'FileReference',
  FileReferenceSchema
);
