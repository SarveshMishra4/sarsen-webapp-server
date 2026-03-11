import mongoose, { Document, Schema } from 'mongoose';

// ─── Engagement Checklist Step ────────────────────────────────────────────────
// Copied from Service.defaultChecklist at purchase time.
// Each engagement has its own independent copy — editing the service later
// does not affect engagements already created.

export interface IEngagementChecklistStep {
  stepId: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

const EngagementChecklistStepSchema = new Schema<IEngagementChecklistStep>(
  {
    stepId:      { type: String, required: true },
    title:       { type: String, required: true, trim: true },
    order:       { type: Number, required: true },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

// ─── Engagement ───────────────────────────────────────────────────────────────

export type EngagementStatus = 'ongoing' | 'completed' | 'delivered';

export interface IEngagement extends Document {
  userId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  couponId?: mongoose.Types.ObjectId;
  status: EngagementStatus;
  engagementChecklist: IEngagementChecklistStep[];
  progressPercent: number;
  canDeliver: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EngagementSchema = new Schema<IEngagement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'delivered'],
      default: 'ongoing',
      index: true,
    },
    engagementChecklist: {
      type: [EngagementChecklistStepSchema],
      default: [],
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    canDeliver: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Engagement = mongoose.model<IEngagement>('Engagement', EngagementSchema);
