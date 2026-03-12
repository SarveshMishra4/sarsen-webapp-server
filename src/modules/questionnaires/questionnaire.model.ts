import mongoose, { Document, Schema } from 'mongoose';

/**
 * Questionnaire (In-Engagement)
 *
 * Created by admin DURING an active engagement.
 * This is SEPARATE from the purchase questionnaire answered at checkout.
 *
 * Flow:
 * 1. Admin creates a Questionnaire and attaches it to an engagement
 * 2. Admin adds Questions to the Questionnaire
 * 3. User is notified
 * 4. User submits Answers before the deadline
 * 5. After submission, questionnaire is locked — no further edits
 *
 * Locked conditions:
 * - After user submits answers
 * - After engagement is marked as delivered
 */

// ─── Questionnaire ───────────────────────────────────────────────

export interface IQuestionnaire extends Document {
  engagementId: mongoose.Types.ObjectId;
  title: string;
  deadline: Date;
  isSubmitted: boolean;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionnaireSchema = new Schema<IQuestionnaire>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Questionnaire = mongoose.model<IQuestionnaire>('Questionnaire', QuestionnaireSchema);

// ─── Question ───────────────────────────────────────────────────

export interface IQuestion extends Document {
  questionnaireId: mongoose.Types.ObjectId;
  text: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: 'Questionnaire',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);

// ─── Answer ─────────────────────────────────────────────────────

export interface IAnswer extends Document {
  questionId: mongoose.Types.ObjectId;
  questionnaireId: mongoose.Types.ObjectId;
  engagementId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  answerText: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    questionnaireId: {
      type: Schema.Types.ObjectId,
      ref: 'Questionnaire',
      required: true,
      index: true,
    },
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    answerText: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
