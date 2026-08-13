import mongoose, { Document, Schema } from 'mongoose';
import { LEAD_MAGNET_TYPES, LeadMagnetType, AnswerScaleValue } from './leadmagnet.constants.js';

// ─── Client ─────────────────────────────────────────────────────────────────
// One record per unique (normalized) email address. This is intentionally
// separate from the `identity` module's User model — that model represents
// real logged-in accounts (email + hashedPassword). A Client here is just an
// identity key for connecting lead-magnet submissions together. There is no
// password, no login, no account creation for founders — by design.

export interface IClient extends Document {
  email: string;
  submissionCount: number;
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
  },
  { timestamps: true }
);

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

// Speeds up the future admin screen: "show me this client's submissions,
// most recent first."
LeadMagnetSubmissionSchema.index({ clientId: 1, createdAt: -1 });

export const LeadMagnetSubmission = mongoose.model<ILeadMagnetSubmission>(
  'LeadMagnetSubmission',
  LeadMagnetSubmissionSchema
);