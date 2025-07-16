import { Request, Response } from 'express';
import {
  createRazorpaySubscription,
  createSubscription,
  getUserSubscriptions,
  pauseAllSubscriptions,
  verifyPayment,
} from '../services/subscriptionService';
import { AuthenticatedRequest } from '../types/express';

export const createSubscriptionController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Replace with typed middleware if available
    const subscriptionData = { ...req.body, userId };
    const subscription = await createSubscription(subscriptionData);
    const razorpaySubscription = await createRazorpaySubscription(subscription);

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription,
      razorpaySubscription,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

export const verifyPaymentController = async (req: Request, res: Response) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
    const isValid = await verifyPayment(razorpay_payment_id, razorpay_subscription_id, razorpay_signature);

    if (isValid) {
      res.status(200).json({ message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

export const getUserSubscriptionsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID missing' });
    }

    const subscriptions = await getUserSubscriptions(userId); // ✅ userId is now guaranteed to be string
    res.status(200).json({ message: 'Fetched subscriptions successfully', subscriptions });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const pauseAllSubscriptionsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID missing' });
    }

    const result = await pauseAllSubscriptions(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};