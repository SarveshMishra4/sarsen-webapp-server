import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IAdmin extends Document {
  email: string;
  hashedPassword: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const AdminSchema = new Schema<IAdmin>(
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
      select: false, // Never returned by default in queries Need to Be Exclusively Added When Comparing Passwords
    },
  },
  { timestamps: true }
);

AdminSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.hashedPassword);
};

// Strip password from all JSON output — never exposed in responses
AdminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as any).hashedPassword;
    return ret;
  },
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
