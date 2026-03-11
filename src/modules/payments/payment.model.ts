import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface IPayment extends Document {
  engagementId?: mongoose.Types.ObjectId; // Set after engagement is created on success
  razorpayOrderId: string;
  razorpayPaymentId?: string;             // Set after successful payment
  razorpaySignature?: string;             // Set after webhook verification
  amount: number;                         // Final price in paise (Razorpay format)
  currency: string;
  status: PaymentStatus;
  serviceId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;       // Set after user identity is resolved
  couponId?: mongoose.Types.ObjectId;
  purchaseAnswers?: object;               // Snapshot of purchase questionnaire
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    engagementId: {
      type: Schema.Types.ObjectId,
      ref: 'Engagement',
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    purchaseAnswers: {
      type: Schema.Types.Mixed,
    },
    failureReason: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
