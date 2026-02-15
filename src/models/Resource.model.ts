/**
 * Resource Model
 * 
 * Stores resources (files, links) shared with clients within an engagement.
 * Supports different resource types with appropriate metadata.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type ResourceType = 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image' | 'other';

export interface IResource extends Document {
  // Core fields
  engagementId: mongoose.Types.ObjectId;
  sharedBy: mongoose.Types.ObjectId; // Admin who shared
  sharedByName?: string; // Snapshot of admin name
  
  // Resource metadata
  type: ResourceType;
  title: string;
  description?: string;
  
  // Content (one of these will be populated)
  url?: string; // For links and external resources
  fileKey?: string; // For file storage (S3, etc.)
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Display settings
  icon?: string; // Override default icon
  thumbnailUrl?: string; // For preview
  
  // Access tracking
  downloadCount: number;
  viewCount: number;
  lastAccessedAt?: Date;
  
  // Status
  isActive: boolean;
  isPublic: boolean; // If true, accessible without auth (rare)
  
  // Metadata
  metadata?: Map<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: [true, 'Engagement ID is required'],
      index: true,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Shared by admin is required'],
    },
    sharedByName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['pdf', 'doc', 'excel', 'ppt', 'link', 'video', 'image', 'other'],
      required: [true, 'Resource type is required'],
    },
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    url: {
      type: String,
      trim: true,
    },
    fileKey: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: 0,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Increment resource count on engagement when resource is created
ResourceSchema.post('save', async function(doc) {
  try {
    const Engagement = mongoose.model('Engagement');
    await Engagement.findByIdAndUpdate(
      doc.engagementId,
      { $inc: { resourceCount: 1 } }
    );
  } catch (error) {
    console.error('Error updating engagement resource count:', error);
  }
});

// Decrement resource count on engagement when resource is deleted
ResourceSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const Engagement = mongoose.model('Engagement');
      await Engagement.findByIdAndUpdate(
        doc.engagementId,
        { $inc: { resourceCount: -1 } }
      );
    } catch (error) {
      console.error('Error updating engagement resource count:', error);
    }
  }
});

// Indexes for faster queries
ResourceSchema.index({ engagementId: 1, createdAt: -1 });
ResourceSchema.index({ type: 1 });
ResourceSchema.index({ isActive: 1 });

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);