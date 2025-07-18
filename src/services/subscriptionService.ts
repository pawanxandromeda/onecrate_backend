import Razorpay from 'razorpay';
import Subscription, { ISubscription } from '../models/subscription';
import crypto from 'crypto';
import axios from 'axios';

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
  if (!data.subscriptionName || !data.items.length || data.grandTotal <= 0) {
    throw new Error('Invalid subscription data');
  }

  const subscription = new Subscription({
    ...data,
    paymentStatus: 'pending',
    autopay: true,
    status: 'active',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  
  await subscription.save();
  return subscription;
};

export const createRazorpaySubscription = async (subscription: ISubscription) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Missing Razorpay API keys');
    }

    if (!subscription.grandTotal || subscription.grandTotal < 1) {
      throw new Error('Invalid subscription amount');
    }

    // Create subscription directly without plan
    const subscriptionPayload = {
      plan_id: null,
      total_count: 24, // 2 years maximum
      quantity: 1,
      customer_notify: 1,
      start_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // Start after 30 days
      notes: {
        subscriptionId: subscription._id.toString(),
      },
      item: {
        name: subscription.subscriptionName.slice(0, 120),
        amount: Math.round(subscription.grandTotal * 100), // Convert to paise
        currency: 'INR',
        description: `Monthly subscription for ${subscription.subscriptionName.slice(0, 255)}`
      }
    };

    console.log('Creating Razorpay subscription:', JSON.stringify(subscriptionPayload, null, 2));

    // Create subscription using request API
    const options = {
      method: 'POST',
      url: '/v1/subscriptions',
      data: subscriptionPayload
    };

const razorpaySubscription = await razorpay.subscriptions.create(subscriptionPayload as any);

    console.log('Razorpay subscription created:', JSON.stringify(razorpaySubscription, null, 2));

    // Update subscription with Razorpay ID
    await Subscription.findByIdAndUpdate(subscription._id, {
      razorpaySubscriptionId: razorpaySubscription.id,
    });

    return razorpaySubscription;
  } catch (error: any) {
    console.error('[Razorpay Subscription ERROR]', {
      message: error.message || 'Unknown error',
      response: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No response data',
    });
    throw new Error(`Failed to create subscription: ${error.message || 'Unknown error'}`);
  }
};

export const verifyPayment = async (
  razorpay_payment_id: string,
  razorpay_subscription_id: string,
  razorpay_signature: string
): Promise<boolean> => {
  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    throw new Error('Missing payment verification parameters');
  }

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
  if (!userId) {
    throw new Error('User ID is required');
  }
  return await Subscription.find({ userId }).sort({ createdAt: -1 });
};

export const pauseAllSubscriptions = async (userId: string) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

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

