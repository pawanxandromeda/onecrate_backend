import Razorpay from 'razorpay';
import Subscription, { ISubscription } from '../models/subscription';
import crypto from 'crypto';

// Define Razorpay payload types
interface RazorpayPlanItem {
  name: string;
  amount: number;
  currency: 'INR';
  description?: string;
}

interface RazorpayPlanCreateRequestBody {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  item: RazorpayPlanItem;
}

interface RazorpaySubscriptionCreateRequestBody {
  plan_id: string;
  total_count: number;
  quantity: number;
  start_at?: number;
  notes?: Record<string, string>;
}

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
  // Validate subscription data
  if (!data.subscriptionName || !data.items.length || data.grandTotal <= 0) {
    throw new Error('Invalid subscription data: missing name, items, or invalid grandTotal');
  }

  const subscription = new Subscription({
    ...data,
    paymentStatus: 'pending',
    autopay: true,
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  });
  await subscription.save();
  return subscription;
};

export const createRazorpaySubscription = async (subscription: ISubscription) => {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay API keys are missing in environment variables');
    }

    // Validate subscription data
    if (!subscription.grandTotal || subscription.grandTotal <= 0) {
      throw new Error('Invalid grandTotal for subscription');
    }
    if (!subscription.subscriptionName) {
      throw new Error('Subscription name is required');
    }
    if (subscription.grandTotal < 1) {
      throw new Error('Razorpay requires a minimum amount of 1 INR');
    }

    // Test API connectivity with a simple request
    try {
      const testResponse = await razorpay.plans.all({ count: 1 });
      console.log('Razorpay API connectivity test successful:', JSON.stringify(testResponse, null, 2));
    } catch (testError: any) {
      console.error('Razorpay API connectivity test failed:', {
        message: testError.message,
        stack: testError.stack,
        response: testError.response ? JSON.stringify(testError.response.data, null, 2) : 'No response data',
      });
      throw new Error('Failed to connect to Razorpay API');
    }

    // Define plan payload
    const planPayload: RazorpayPlanCreateRequestBody = {
      period: 'monthly',
      interval: 1,
      item: {
        name: subscription.subscriptionName.slice(0, 120), // Razorpay limits name to 120 characters
        amount: Math.round(subscription.grandTotal * 100), // Convert to paise, ensure integer
        currency: 'INR',
        description: `Monthly subscription for ${subscription.subscriptionName.slice(0, 255)}`, // Limit description length
      },
    };
    console.log('Creating Razorpay plan with payload:', JSON.stringify(planPayload, null, 2));

    // Create Razorpay plan
    const subscriptionPlan = await razorpay.plans.create(planPayload);
    console.log('Razorpay plan created:', JSON.stringify(subscriptionPlan, null, 2));

    // Define subscription payload
    const subscriptionPayload: RazorpaySubscriptionCreateRequestBody = {
      plan_id: subscriptionPlan.id,
      total_count: 12, // 12 months subscription
      quantity: 1,
      start_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // Start after 30 days
      notes: {
        subscriptionId: subscription._id.toString(),
      },
    };
    console.log('Creating Razorpay subscription with payload:', JSON.stringify(subscriptionPayload, null, 2));

    // Create Razorpay subscription
    const razorpaySubscription = await razorpay.subscriptions.create(subscriptionPayload);
    console.log('Razorpay subscription created:', JSON.stringify(razorpaySubscription, null, 2));

    // Update subscription with Razorpay subscription ID
    await Subscription.findByIdAndUpdate(subscription._id, {
      razorpaySubscriptionId: razorpaySubscription.id,
    });

    return razorpaySubscription;
  } catch (error: any) {
    console.error('[Razorpay Subscription ERROR]', {
      message: error.message || 'Unknown error',
      stack: error.stack || 'No stack trace',
      response: error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data',
    });
    throw new Error(`Failed to create Razorpay subscription: ${error.message || 'Unknown error'}`);
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