/**
 * Feedback Model
 * 
 * Stores mandatory feedback submitted by clients after engagement completion.
 * Feedback is required before clients can access their engagement in read-only mode.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export interface IFeedback extends Document {
  // Core references
  engagementId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Feedback content
  rating: FeedbackRating;
  review?: string;
  wouldRecommend: boolean;
  wouldUseAgain: boolean;
  
  // Detailed feedback categories
  communication?: FeedbackRating;
  quality?: FeedbackRating;
  timeliness?: FeedbackRating;
  value?: FeedbackRating;
  
  // Additional feedback
  whatWorkedWell?: string[];
  whatCouldBeImproved?: string[];
  additionalComments?: string;
  
  // Testimonial consent
  allowTestimonial: boolean;
  testimonial?: string;
  
  // Metadata
  ipAddress?: string;
  userAgent?: string;
  timeSpent?: number; // Time spent on feedback form (seconds)
  
  // Admin notes (internal only)
  adminNotes?: string;
  isHighlighted: boolean; // For showcasing on website
  
  // Timestamps
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: [true, 'Engagement ID is required'],
      unique: true, // One feedback per engagement
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },
    wouldRecommend: {
      type: Boolean,
      required: [true, 'Would recommend is required'],
    },
    wouldUseAgain: {
      type: Boolean,
      required: [true, 'Would use again is required'],
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
    },
    quality: {
      type: Number,
      min: 1,
      max: 5,
    },
    timeliness: {
      type: Number,
      min: 1,
      max: 5,
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
    },
    whatWorkedWell: [{
      type: String,
      trim: true,
    }],
    whatCouldBeImproved: [{
      type: String,
      trim: true,
    }],
    additionalComments: {
      type: String,
      trim: true,
      maxlength: [1000, 'Additional comments cannot exceed 1000 characters'],
    },
    allowTestimonial: {
      type: Boolean,
      default: false,
    },
    testimonial: {
      type: String,
      trim: true,
      maxlength: [500, 'Testimonial cannot exceed 500 characters'],
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    timeSpent: {
      type: Number,
      min: 0,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    isHighlighted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
FeedbackSchema.index({ rating: 1 });
FeedbackSchema.index({ isHighlighted: 1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ engagementId: 1 }, { unique: true });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);