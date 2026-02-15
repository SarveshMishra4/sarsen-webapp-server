/**
 * Engagement Model
 * 
 * Core entity of the entire system.
 * An engagement represents a single purchased service instance for a client.
 * All messaging, resources, questionnaires, and progress tracking happen within an engagement.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { MilestoneType } from '../constants/milestones';

export interface IEngagement extends Document {
  // Core identification
  engagementId: string; // Human-readable ID (e.g., ENG-2024-001)
  serviceCode: string; // Reference to service blueprint
  serviceName: string; // Snapshot of service name at purchase time
  
  // Relationships
  userId: mongoose.Types.ObjectId; // Client who owns this engagement
  createdBy: mongoose.Types.ObjectId; // Admin who created (via payment)
  
  // Blueprint snapshot (cloned at creation)
  blueprintId: mongoose.Types.ObjectId;
  blueprintVersion: number;
  
  // Content (cloned from blueprint)
  milestones: {
    value: MilestoneType;
    label: string;
    description?: string;
    order: number;
    isAutomatic: boolean;
    completedAt?: Date;
  }[];
  
  sections: {
    title: string;
    description?: string;
    type: string;
    order: number;
    content?: any;
  }[];
  
  resources: {
    type: string;
    title: string;
    description?: string;
    url?: string;
    fileKey?: string;
    order: number;
    isRequired: boolean;
    addedAt: Date;
  }[];
  
  // Progress tracking
  currentProgress: MilestoneType; // Current milestone (from MILESTONES)
  progressHistory: {
    value: MilestoneType;
    updatedAt: Date;
    updatedBy: mongoose.Types.ObjectId; // Admin who updated
    note?: string;
  }[];
  
  // Status flags
  messagingAllowed: boolean;
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  
  // Counters (for dashboard display)
  messageCount: number;
  resourceCount: number;
  questionnaireCount: number;
  
  // Timelines
  startDate: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;
  
  // Metadata
  metadata?: Map<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneHistorySchema = new Schema({
  value: {
    type: Number,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  note: {
    type: String,
    trim: true,
  },
});

const EngagementSchema = new Schema<IEngagement>(
  {
    engagementId: {
      type: String,
      required: [true, 'Engagement ID is required'],
      unique: true,
      trim: true,
    },
    serviceCode: {
      type: String,
      required: [true, 'Service code is required'],
      uppercase: true,
      trim: true,
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Created by admin is required'],
    },
    blueprintId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceBlueprint',
      required: true,
    },
    blueprintVersion: {
      type: Number,
      default: 1,
    },
    milestones: [{
      value: Number,
      label: String,
      description: String,
      order: Number,
      isAutomatic: Boolean,
      completedAt: Date,
    }],
    sections: [{
      title: String,
      description: String,
      type: String,
      order: Number,
      content: Schema.Types.Mixed,
    }],
    resources: [{
      type: {
        type: String,
        enum: ['pdf', 'doc', 'excel', 'ppt', 'link', 'video', 'image'],
      },
      title: String,
      description: String,
      url: String,
      fileKey: String,
      order: Number,
      isRequired: Boolean,
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    currentProgress: {
      type: Number,
      default: 10,
      required: true,
    },
    progressHistory: [MilestoneHistorySchema],
    messagingAllowed: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    resourceCount: {
      type: Number,
      default: 0,
    },
    questionnaireCount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expectedEndDate: {
      type: Date,
    },
    actualEndDate: {
      type: Date,
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

// Indexes for faster lookups
EngagementSchema.index({ engagementId: 1 });
EngagementSchema.index({ userId: 1 });
EngagementSchema.index({ serviceCode: 1 });
EngagementSchema.index({ currentProgress: 1 });
EngagementSchema.index({ isActive: 1 });
EngagementSchema.index({ isCompleted: 1 });
EngagementSchema.index({ createdAt: -1 }); // For sorting newest first

export const Engagement = mongoose.model<IEngagement>('Engagement', EngagementSchema);