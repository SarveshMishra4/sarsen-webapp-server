import mongoose, { Document, Schema } from 'mongoose';

// ─── Checklist Step ───────────────────────────────────────────────────────────

export interface IChecklistStep {
  stepId: string;
  title: string;
  order: number;
}

const ChecklistStepSchema = new Schema<IChecklistStep>(
  {
    stepId: { type: String, required: true },
    title:  { type: String, required: true, trim: true },
    order:  { type: Number, required: true },
  },
  { _id: false }
);

// ─── Service ─────────────────────────────────────────────────────────────────

export type ServiceType = 'service' | 'cohort';

export interface IService extends Document {
  title: string;
  description: string;
  price: number;
  type: ServiceType;
  isActive: boolean;
  defaultChecklist: IChecklistStep[];
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['service', 'cohort'],
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    defaultChecklist: {
      type: [ChecklistStepSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const Service = mongoose.model<IService>('Service', ServiceSchema);
