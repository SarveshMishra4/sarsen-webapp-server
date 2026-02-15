/**
 * Service Blueprint Model
 * 
 * Defines the template for a service that will be cloned when an engagement is created.
 * This is the source of truth for what content appears in a client's dashboard.
 */

import mongoose, { Schema, Document } from 'mongoose';

// Resource types for dashboard content
export type ResourceType = 'pdf' | 'doc' | 'excel' | 'ppt' | 'link' | 'video' | 'image';

export interface IBlueprintResource {
  type: ResourceType;
  title: string;
  description?: string;
  url?: string; // For links
  fileKey?: string; // For file storage (future)
  order: number;
  isRequired: boolean;
}

export interface IBlueprintSection {
  title: string;
  description?: string;
  type: 'milestones' | 'resources' | 'questionnaires' | 'instructions' | 'custom';
  order: number;
  content?: any; // Flexible for different section types
}

export interface IBlueprintMilestone {
  value: number; // Should be from MILESTONES constants
  label: string;
  description?: string;
  order: number;
  isAutomatic: boolean; // Whether this milestone is auto-set by system
}

export interface IServiceBlueprint extends Document {
  // Service identification
  serviceCode: string; // Unique code like 'SRV_FUND_001'
  serviceName: string;
  serviceSlug: string; // Matches frontend slug
  
  // Blueprint content
  milestones: IBlueprintMilestone[];
  sections: IBlueprintSection[];
  resources: IBlueprintResource[];
  
  // Default settings
  defaultProgress: number; // Starting milestone (usually 10%)
  messagingEnabledByDefault: boolean;
  
  // Metadata
  version: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId; // Admin who created/updated
  createdAt: Date;
  updatedAt: Date;
}

const BlueprintResourceSchema = new Schema<IBlueprintResource>(
  {
    type: {
      type: String,
      enum: ['pdf', 'doc', 'excel', 'ppt', 'link', 'video', 'image'],
      required: [true, 'Resource type is required'],
    },
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },
    fileKey: {
      type: String,
    },
    order: {
      type: Number,
      default: 0,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const BlueprintSectionSchema = new Schema<IBlueprintSection>(
  {
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['milestones', 'resources', 'questionnaires', 'instructions', 'custom'],
      required: [true, 'Section type is required'],
    },
    order: {
      type: Number,
      default: 0,
    },
    content: {
      type: Schema.Types.Mixed, // Flexible for different section types
    },
  },
  { _id: true }
);

const BlueprintMilestoneSchema = new Schema<IBlueprintMilestone>(
  {
    value: {
      type: Number,
      required: [true, 'Milestone value is required'],
    },
    label: {
      type: String,
      required: [true, 'Milestone label is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isAutomatic: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const ServiceBlueprintSchema = new Schema<IServiceBlueprint>(
  {
    serviceCode: {
      type: String,
      required: [true, 'Service code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
    },
    serviceSlug: {
      type: String,
      required: [true, 'Service slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    milestones: {
      type: [BlueprintMilestoneSchema],
      default: [],
    },
    sections: {
      type: [BlueprintSectionSchema],
      default: [],
    },
    resources: {
      type: [BlueprintResourceSchema],
      default: [],
    },
    defaultProgress: {
      type: Number,
      default: 10,
    },
    messagingEnabledByDefault: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
ServiceBlueprintSchema.index({ serviceCode: 1 });
ServiceBlueprintSchema.index({ serviceSlug: 1 });
ServiceBlueprintSchema.index({ isActive: 1 });

export const ServiceBlueprint = mongoose.model<IServiceBlueprint>(
  'ServiceBlueprint',
  ServiceBlueprintSchema
);