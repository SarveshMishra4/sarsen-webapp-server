import mongoose, { Document, Schema } from 'mongoose';
import { BLOG_TAGS, BLOG_STATUSES, BlogTag, BlogStatus } from './blog.constants.js';

// ─── Sub-documents ──────────────────────────────────────────────────────────

export interface IBlogImage {
  url: string;
  altText?: string;
  order: number;
}

export interface IBlogReport {
  mockupImageUrl: string;
  name: string;
  description: string;
  authors: string[]; // 1–3 names
  releaseDate: Date;
}

const BlogImageSchema = new Schema<IBlogImage>(
  {
    url: { type: String, required: true },
    altText: { type: String, trim: true },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const BlogReportSchema = new Schema<IBlogReport>(
  {
    mockupImageUrl: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    authors: {
      type: [String],
      required: true,
      validate: {
        validator: (arr: string[]) => arr.length >= 1 && arr.length <= 3,
        message: 'Report must have between 1 and 3 authors',
      },
    },
    releaseDate: { type: Date, required: true },
  },
  { _id: false }
);

// ─── Blog ───────────────────────────────────────────────────────────────────

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // sanitized HTML — bold, links, tables only
  tag: BlogTag;
  keywords: string[]; // visible chips on the public post
  coverImageUrl: string;
  authorName: string;
  authorTitle?: string;
  authorImageUrl?: string;
  status: BlogStatus;
  publishedAt?: Date;
  readTimeMinutes: number;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  canonicalUrl?: string;
  images: IBlogImage[];
  report?: IBlogReport;
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    tag: { type: String, enum: BLOG_TAGS, required: true, index: true },
    keywords: { type: [String], default: [] },
    coverImageUrl: { type: String, required: true },
    authorName: { type: String, required: true, trim: true },
    authorTitle: { type: String, trim: true },
    authorImageUrl: { type: String },
    status: {
      type: String,
      enum: BLOG_STATUSES,
      required: true,
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    readTimeMinutes: { type: Number, required: true, default: 1 },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    seoOgImage: { type: String },
    canonicalUrl: { type: String },
    images: { type: [BlogImageSchema], default: [] },
    report: { type: BlogReportSchema, default: undefined },
  },
  { timestamps: true }
);

// Speeds up the public listing: published posts, newest first, optionally
// filtered by tag — matches the exact query shape used by getPublishedList.
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ status: 1, tag: 1, publishedAt: -1 });

export const Blog = mongoose.model<IBlog>('Blog', BlogSchema);
