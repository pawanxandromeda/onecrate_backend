import mongoose, { Schema, Document } from 'mongoose';

interface ISubscriptionItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  mrp: number;
  unit: string;
}

interface ISubscription extends Document {
  _id: string;
  userId: string;
  subscriptionName: string;
  items: ISubscriptionItem[];
  totalItems: number;
  subtotal: number;
  platformFee: number;
  totalMRP: number;
  totalSavings: number;
  grandTotal: number;
  createdAt: Date;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentId?: string;
  razorpaySubscriptionId?: string;
  autopay: boolean;
  status: 'active' | 'paused' | 'cancelled';
  nextBillingDate?: Date; // Added for recurring subscriptions
}

const SubscriptionItemSchema = new Schema<ISubscriptionItem>({
  productId: { type: Number, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  mrp: { type: Number, required: true },
  unit: { type: String, required: true },
});

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: String, required: true },
  subscriptionName: { type: String, required: true },
  items: [SubscriptionItemSchema],
  totalItems: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  totalMRP: { type: Number, required: true },
  totalSavings: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentId: { type: String },
  razorpaySubscriptionId: { type: String },
  autopay: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
  nextBillingDate: { type: Date }, // Added for tracking next billing
});

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export type { ISubscription, ISubscriptionItem };