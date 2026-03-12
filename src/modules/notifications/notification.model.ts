import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'new_message'
  | 'new_engagement'
  | 'questionnaire_assigned'
  | 'questionnaire_submitted'
  | 'contact_form_submitted'
  | 'engagement_delivered'
  | 'payment_success'
  | 'feedback_submitted';

export type RecipientRole = 'user' | 'admin';

export interface INotification extends Document {
  recipientId: string;         // userId or adminId — string so both types fit
  recipientRole: RecipientRole;
  type: NotificationType;
  message: string;             // Human-readable description
  engagementId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'new_message',
        'new_engagement',
        'questionnaire_assigned',
        'questionnaire_submitted',
        'contact_form_submitted',
        'engagement_delivered',
        'payment_success',
        'feedback_submitted',
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
