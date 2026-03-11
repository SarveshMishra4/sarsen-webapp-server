import mongoose, { Document, Schema } from 'mongoose';

/**
 * PurchaseAnswer
 *
 * Stores the answers a user submits at checkout time
 * when purchasing a service that has a predefined questionnaire.
 *
 * This is SEPARATE from in-engagement questionnaires (Questionnaire model).
 *
 * - These answers are collected BEFORE the engagement is created
 * - They are submitted as part of the purchase flow
 * - They are stored permanently against the engagement
 * - Admin can read them; user cannot edit them after purchase
 */

export interface IPurchaseAnswer {
  questionKey: string;   // Identifier for the question (defined by frontend form)
  questionLabel: string; // Human-readable question text (snapshot at purchase time)
  answer: string;        // User's answer
}

export interface IPurchaseQuestionnaire extends Document {
  engagementId: mongoose.Types.ObjectId;
  answers: IPurchaseAnswer[];
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseAnswerSchema = new Schema<IPurchaseAnswer>(
  {
    questionKey: { type: String, required: true },
    questionLabel: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const PurchaseQuestionnaireSchema = new Schema<IPurchaseQuestionnaire>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: true,
      index: true,
    },
    answers: {
      type: [PurchaseAnswerSchema],
      required: true,
      validate: {
        validator: (v: IPurchaseAnswer[]) => v.length > 0,
        message: 'At least one answer is required',
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const PurchaseQuestionnaire = mongoose.model<IPurchaseQuestionnaire>(
  'PurchaseQuestionnaire',
  PurchaseQuestionnaireSchema
);
