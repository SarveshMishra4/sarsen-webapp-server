/**
 * Message Model
 * 
 * Stores all messages exchanged within an engagement.
 * Messages are engagement-scoped - each message belongs to exactly one engagement.
 * Supports both admin and client senders.
 */

import mongoose, { Schema, Document } from 'mongoose';

export type SenderType = 'admin' | 'client';

export interface IMessage extends Document {
  // Core fields
  engagementId: mongoose.Types.ObjectId; // Reference to engagement
  senderId: mongoose.Types.ObjectId; // User or Admin ID
  senderType: SenderType; // Identifies if sender is admin or client
  senderName?: string; // Snapshot of sender's name at time of sending
  
  // Message content
  content: string;
  attachments?: {
    type: string;
    url: string;
    name: string;
    size?: number;
  }[];
  
  // Status tracking
  isRead: boolean;
  readBy?: {
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  
  // Metadata
  metadata?: Map<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
      required: [true, 'Engagement ID is required'],
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Sender ID is required'],
      index: true,
    },
    senderType: {
      type: String,
      enum: ['admin', 'client'],
      required: [true, 'Sender type is required'],
    },
    senderName: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    attachments: [{
      type: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
      },
    }],
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [{
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
MessageSchema.index({ engagementId: 1, createdAt: -1 }); // For fetching messages in reverse chronological order
MessageSchema.index({ engagementId: 1, isRead: 1 }); // For unread count queries
MessageSchema.index({ senderId: 1, createdAt: -1 }); // For user's message history

export const Message = mongoose.model<IMessage>('Message', MessageSchema);