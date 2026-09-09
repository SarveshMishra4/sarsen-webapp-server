import mongoose, { Document, Schema } from 'mongoose';

// ─── Report Interest ──────────────────────────────────────────────────────────
// Captures submissions from the "Request Full Report" modal on the homepage
// (Indian Startup Ecosystem Report 2026). Phase 1 scope: receive + persist only.
// Phase 2 will add admin retrieval/status endpoints on top of this model.

export type ReportInterestStatus = 'new' | 'reviewed' | 'sent';

export const DESCRIBES_YOU_OPTIONS = [
  'Founder or Co-founder',
  'CXO or Leadership',
  'Early Employee',
  'Investor or Advisor',
  'Other',
] as const;

export const BUSINESS_STAGE_OPTIONS = [
  'Pre-idea / Exploring',
  'Idea validated, No Revenue',
  'Early revenue',
  'Scaling',
  'Preparing to Raise Capital',
  'Post-Fundraise',
] as const;

export const UNCERTAINTY_OPTIONS = [
  'Product',
  'Customer Profile',
  'Pricing',
  'Fundraising',
  'Scalability',
  'Unsure or Something Else',
] as const;

export interface IReportInterest extends Document {
  fullName: string;
  email: string;
  phone: string;
  describesYou: typeof DESCRIBES_YOU_OPTIONS[number];
  businessStage: typeof BUSINESS_STAGE_OPTIONS[number];
  uncertainty: typeof UNCERTAINTY_OPTIONS[number];
  status: ReportInterestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ReportInterestSchema = new Schema<IReportInterest>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    describesYou: {
      type: String,
      enum: DESCRIBES_YOU_OPTIONS,
      required: true,
    },
    businessStage: {
      type: String,
      enum: BUSINESS_STAGE_OPTIONS,
      required: true,
    },
    uncertainty: {
      type: String,
      enum: UNCERTAINTY_OPTIONS,
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'sent'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export const ReportInterest = mongoose.model<IReportInterest>(
  'ReportInterest',
  ReportInterestSchema
);
