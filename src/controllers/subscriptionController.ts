import { Request, Response } from 'express';
import {
  createRazorpaySubscription,
  createSubscription,
  getUserSubscriptions,
  pauseAllSubscriptions,
  verifyPayment,
} from '../services/subscriptionService';
import { AuthenticatedRequest } from '../types/express';
import Subscription from '../models/subscription'; // Import the Subscription model
import mongoose from 'mongoose'; // Import mongoose for ObjectId

export const createSubscriptionController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID missing' });
    }

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

    const subscriptions = await getUserSubscriptions(userId);
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

export const webhookController = async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;
    if (event === 'subscription.charged') {
      const { subscription, payment } = payload;
      const subscriptionId = subscription.id;
      const amount = payment.amount / 100; // Convert paise to rupees

      // Find the original subscription
      const existingSubscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
      if (!existingSubscription) {
        throw new Error('Subscription not found');
      }

      // Create a new subscription instance for the recurring order
      const newSubscription = new Subscription({
        ...existingSubscription.toObject(),
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        paymentStatus: 'completed',
        paymentId: payment.id,
        nextBillingDate: new Date(subscription.next_billing_at * 1000),
      });

      await newSubscription.save();
      console.log(`Recurring subscription order created for subscription ID: ${subscriptionId}`);
    }
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ message: (error as Error).message });
  }
};