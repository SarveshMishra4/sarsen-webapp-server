/**
 * Questionnaire Model
 * 
 * Stores questionnaires sent to clients within an engagement.
 * Tracks submission status, deadlines, and responses.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type QuestionnaireStatus = 'pending' | 'submitted' | 'overdue' | 'cancelled';

export interface IQuestion extends Document {
  questionText: string;
  questionType: 'text' | 'textarea' | 'select' | 'multiselect' | 'file' | 'date';
  options?: string[]; // For select/multiselect
  required: boolean;
  order: number;
  answer?: any; // Submitted answer
  fileUrl?: string; // For file uploads
}

export interface IQuestionnaire extends Document {
  // Core fields
  engagementId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId; // Admin who created
  
  // Questionnaire metadata
  title: string;
  description?: string;
  instructions?: string;
  
  // Questions
  questions: IQuestion[];
  
  // Status tracking
  status: QuestionnaireStatus;
  sentAt: Date;
  deadline?: Date;
  submittedAt?: Date;
  
  // Submission info
  submittedBy?: mongoose.Types.ObjectId; // User who submitted
  timeSpent?: number; // Time spent in seconds
  
  // Counters
  totalQuestions: number;
  answeredQuestions: number;
  
  // Reminders
  reminderSentAt?: Date;
  reminderCount: number;
  
  // Metadata
  metadata?: Map<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['text', 'textarea', 'select', 'multiselect', 'file', 'date'],
      required: [true, 'Question type is required'],
    },
    options: [{
      type: String,
      trim: true,
    }],
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
    answer: {
      type: Schema.Types.Mixed,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const QuestionnaireSchema = new Schema<IQuestionnaire>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: [true, 'Engagement ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: [true, 'Created by admin is required'],
    },
    title: {
      type: String,
      required: [true, 'Questionnaire title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    instructions: {
      type: String,
      trim: true,
    },
    questions: [QuestionSchema],
    status: {
      type: String,
      enum: ['pending', 'submitted', 'overdue', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    timeSpent: {
      type: Number,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    answeredQuestions: {
      type: Number,
      default: 0,
    },
    reminderSentAt: {
      type: Date,
    },
    reminderCount: {
      type: Number,
      default: 0,
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

// Update totalQuestions count before saving
QuestionnaireSchema.pre('save', function(next) {
  if (this.questions) {
    this.totalQuestions = this.questions.length;
    
    // Calculate answered questions
    this.answeredQuestions = this.questions.filter(q => q.answer !== undefined && q.answer !== null && q.answer !== '').length;
  }
  next();
});

// Indexes for faster queries
QuestionnaireSchema.index({ engagementId: 1, status: 1 });
QuestionnaireSchema.index({ deadline: 1, status: 1 }); // For overdue checking
QuestionnaireSchema.index({ sentAt: -1 });

export const Questionnaire = mongoose.model<IQuestionnaire>('Questionnaire', QuestionnaireSchema);