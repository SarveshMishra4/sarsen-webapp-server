import mongoose, { Document, Schema } from 'mongoose';

// ─── Admin Note ───────────────────────────────────────────────────────────────

export interface IAdminNote extends Document {
  contactMessageId: mongoose.Types.ObjectId;
  note: string;
  adminId: string;
  adminEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminNoteSchema = new Schema<IAdminNote>(
  {
    contactMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'ContactMessage',
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    adminId: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const AdminNote = mongoose.model<IAdminNote>('AdminNote', AdminNoteSchema);

// ─── Contact Message ──────────────────────────────────────────────────────────

export type ContactStatus = 'new' | 'in_progress' | 'resolved' | 'ignored';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'ignored'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

export const ContactMessage = mongoose.model<IContactMessage>(
  'ContactMessage',
  ContactMessageSchema
);
