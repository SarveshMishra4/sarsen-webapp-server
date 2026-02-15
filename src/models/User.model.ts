/**
 * User Model
 * 
 * Stores client user accounts that are created when a service is purchased.
 * Each user can have multiple engagements over time.
 * Authentication is engagement-scoped - users log in to specific engagements.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { ROLES } from '../constants/roles';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  engagements: mongoose.Types.ObjectId[]; // References to engagements (Phase 5)
  createdAt: Date;
  updatedAt: Date;
  
  // Method to return user without sensitive data
  toJSON(): any;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default in queries
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    engagements: [{
      type: Schema.Types.ObjectId,
      ref: 'Engagement', // Will be created in Phase 5
    }],
  },
  {
    timestamps: true,
  }
);

// Remove sensitive data when converting to JSON
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Index for faster lookups
UserSchema.index({ email: 1 });
UserSchema.index({ engagements: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);