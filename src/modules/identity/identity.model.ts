import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// 1. Define strictly the raw data properties (No methods here!)
export interface IUser {
  email: string;
  hashedPassword: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Define the instance methods separately
export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

// 3. Create a combined Model type for Mongoose
export type UserModel = Model<IUser, {}, IUserMethods>;

// 4. Pass all the generics into the Schema
const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// TypeScript now perfectly understands that 'this' has a hashedPassword!
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.hashedPassword);
};

// Password never leaves the DB — stripped from every JSON response
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // FIX: Cast 'ret' to Partial<IUser> to temporarily make properties optional
    // This satisfies TypeScript's strict rules about the 'delete' operator
    delete (ret as Partial<IUser>).hashedPassword;
    return ret;
  },
});

export const User = mongoose.model<IUser, UserModel>('User', UserSchema);