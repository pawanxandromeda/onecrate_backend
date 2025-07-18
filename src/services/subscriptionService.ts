import Razorpay from 'razorpay';
import Subscription, { ISubscription } from '../models/subscription';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface SubscriptionData {
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
}

export const createSubscription = async (data: SubscriptionData): Promise<ISubscription> => {
  const subscription = new Subscription({
    ...data,
    paymentStatus: 'pending',
    autopay: true,
  });
  await subscription.save();
  return subscription;
};

export const createRazorpayOrder = async (subscription: ISubscription) => {
  try {
    const order = await razorpay.orders.create({
      amount: subscription.grandTotal * 100, // in paise
      currency: 'INR',
      receipt: `order_rcptid_${subscription._id}`,
      notes: {
        subscriptionId: subscription._id.toString(),
      },
    });

    // Save order ID to DB (optional)
    await Subscription.findByIdAndUpdate(subscription._id, {
      razorpayOrderId: order.id,
    });

    return order;
  } catch (error: any) {
    console.error('[Razorpay Order ERROR]', error);
    throw new Error('Failed to create Razorpay order');
  }
};

export const verifyPayment = async (
  razorpay_payment_id: string,
  razorpay_subscription_id: string,
  razorpay_signature: string
): Promise<boolean> => {
  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');

  if (generatedSignature === razorpay_signature) {
    await Subscription.findOneAndUpdate(
      { razorpaySubscriptionId: razorpay_subscription_id },
      { paymentStatus: 'completed', paymentId: razorpay_payment_id }
    );
    return true;
  }

  return false;
};

export const getUserSubscriptions = async (userId: string) => {
  return await Subscription.find({ userId }).sort({ createdAt: -1 });
};

export const pauseAllSubscriptions = async (userId: string) => {
  try {
    const subscriptions = await Subscription.find({ userId, paymentStatus: 'completed', status: 'active' });
    if (subscriptions.length === 0) {
      throw new Error('No active subscriptions found');
    }

    for (const subscription of subscriptions) {
      if (subscription.razorpaySubscriptionId) {
        await razorpay.subscriptions.pause(subscription.razorpaySubscriptionId, {
          pause_at: 'now',
        });
      }
      await Subscription.findByIdAndUpdate(subscription._id, { status: 'paused' });
    }
    return { message: 'All subscriptions paused successfully' };
  } catch (error: any) {
    throw new Error(`Failed to pause subscriptions: ${error.message}`);
  }
};