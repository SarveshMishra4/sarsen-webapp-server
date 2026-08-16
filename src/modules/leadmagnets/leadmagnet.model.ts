import mongoose, { Document, Schema } from 'mongoose';
import { LEAD_MAGNET_TYPES, LeadMagnetType, AnswerScaleValue } from './leadmagnet.constants.js';

// ─── Client ─────────────────────────────────────────────────────────────────
// One record per unique (normalized) email address. This is intentionally
// separate from the `identity` module's User model — that model represents
// real logged-in accounts (email + hashedPassword). A Client here is just an
// identity key for connecting lead-magnet submissions together. There is no
// password, no login, no account creation for founders — by design.
//
// ADMIN-VIEW TRACKING (added for the admin Leads panel):
// `isViewed` is a ONE-WAY flag. It flips true the first time an admin opens
// this client's row in the admin panel, and never resets — not even when the
// client submits a brand-new lead magnet later. New activity from an
// already-viewed client still surfaces (their `lastActivityAt` bumps and
// their latest submission sorts to the top within their own submissions
// list), but they do NOT move back into the "New" list. This was a deliberate
// product decision — see leadmagnet.service.ts admin section for the sort
// logic this supports.

export interface IClient extends Document {
  email: string;
  submissionCount: number;
  isViewed: boolean;
  viewedAt?: Date;
  viewedBy?: string; // admin's id from the JWT payload (req.adminId) — no AdminUser collection exists to ref against
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    submissionCount: {
      type: Number,
      required: true,
      default: 0,
    },
    isViewed: {
      type: Boolean,
      required: true,
      default: false,
    },
    viewedAt: {
      type: Date,
    },
    viewedBy: {
      type: String,
    },
    // Denormalized on every submission (see resolveClient in leadmagnet.service.ts).
    // Avoids an aggregation/lookup against LeadMagnetSubmission just to sort
    // the admin Leads list by recency.
    lastActivityAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Powers the admin Leads list: filter by New/Old (isViewed), sort by recency.
ClientSchema.index({ isViewed: 1, lastActivityAt: -1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);

// ─── Lead Magnet Submission ──────────────────────────────────────────────────
// One record per completed lead-magnet interaction. Never overwritten —
// a client submitting the same or a different lead magnet again always
// creates a new document, preserving full history.

export interface ILeadMagnetSubmission extends Document {
  clientId: mongoose.Types.ObjectId;
  leadMagnet: LeadMagnetType;
  founderName: string;
  companyName: string;
  industry: string;
  answers: Record<string, AnswerScaleValue>;
  result: unknown; // shape varies per lead magnet type — see leadmagnet.service.ts
  clientStatusAtSubmission: 'new' | 'existing';
  createdAt: Date;
  updatedAt: Date;
}

const LeadMagnetSubmissionSchema = new Schema<ILeadMagnetSubmission>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    leadMagnet: {
      type: String,
      enum: LEAD_MAGNET_TYPES,
      required: true,
      index: true,
    },
    // NEW (v2)
    founderName: {
      type: String,
      required: true,
      trim: true,
    },
    // CHANGED (v2): was optional in v1, now required.
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    // NEW (v2)
    industry: {
      type: String,
      required: true,
      trim: true,
    },
    answers: {
      type: Schema.Types.Mixed,
      required: true,
    },
    result: {
      type: Schema.Types.Mixed,
      required: true,
    },
    clientStatusAtSubmission: {
      type: String,
      enum: ['new', 'existing'],
      required: true,
    },
  },
  { timestamps: true }
);

// Speeds up the admin screen: "show me this client's submissions,
// most recent first."
LeadMagnetSubmissionSchema.index({ clientId: 1, createdAt: -1 });

export const LeadMagnetSubmission = mongoose.model<ILeadMagnetSubmission>(
  'LeadMagnetSubmission',
  LeadMagnetSubmissionSchema
);