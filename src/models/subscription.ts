import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  userId: string;
  subscriptionName: string;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: number;
    mrp: number;
    unit: string;
  }>;
  totalItems: number;
  subtotal: number;
  platformFee: number;
  totalMRP: number;
  totalSavings: number;
  grandTotal: number;
  paymentStatus: 'pending' | 'completed';
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayTokenId?: string;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true },
    subscriptionName: { type: String, required: true },
    items: [
      {
        productId: Number,
        name: String,
        quantity: Number,
        price: Number,
        mrp: Number,
        unit: String,
      },
    ],
    totalItems: Number,
    subtotal: Number,
    platformFee: Number,
    totalMRP: Number,
    totalSavings: Number,
    grandTotal: Number,
    paymentStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    paymentId: String,
    razorpayOrderId: String,
    razorpayTokenId: String,
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
