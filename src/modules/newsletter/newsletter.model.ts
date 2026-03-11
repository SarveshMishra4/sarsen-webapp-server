import mongoose, { Document, Schema } from 'mongoose';

export interface INewsletterSubscriber extends Document {
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const NewsletterSubscriber = mongoose.model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  NewsletterSubscriberSchema
);
