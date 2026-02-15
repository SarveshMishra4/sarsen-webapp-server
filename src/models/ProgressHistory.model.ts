/**
 * Progress History Model
 * 
 * Stores detailed audit trail of all progress changes for engagements.
 * Tracks when progress was updated, by whom, and any notes.
 * Provides analytics on time spent at each milestone.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { MilestoneType } from '../constants/milestones';

export interface IProgressHistory extends Document {
  // Core references
  engagementId: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId; // Admin who made the change
  updatedByType: 'admin' | 'system'; // Whether changed by admin or automated
  
  // Progress data
  fromValue: MilestoneType;
  toValue: MilestoneType;
  
  // Timing
  updatedAt: Date;
  timeAtMilestone?: number; // Time spent at previous milestone (seconds)
  
  // Metadata
  note?: string;
  isAutomatic: boolean; // Whether this was an automated update
  metadata?: Map<string, any>;
  
  // For rollback/audit purposes
  previousState?: any; // Snapshot of engagement before change
}

const ProgressHistorySchema = new Schema<IProgressHistory>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: [true, 'Engagement ID is required'],
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Updated by is required'],
    },
    updatedByType: {
      type: String,
      enum: ['admin', 'system'],
      default: 'admin',
      required: true,
    },
    fromValue: {
      type: Number,
      required: [true, 'From value is required'],
    },
    toValue: {
      type: Number,
      required: [true, 'To value is required'],
    },
    timeAtMilestone: {
      type: Number,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    isAutomatic: {
      type: Boolean,
      default: false,
    },
    previousState: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, // Adds createdAt but we also have updatedAt
  }
);

// Indexes for faster queries
ProgressHistorySchema.index({ engagementId: 1, createdAt: -1 });
ProgressHistorySchema.index({ updatedBy: 1 });
ProgressHistorySchema.index({ toValue: 1 });
ProgressHistorySchema.index({ createdAt: -1 });

export const ProgressHistory = mongoose.model<IProgressHistory>('ProgressHistory', ProgressHistorySchema);