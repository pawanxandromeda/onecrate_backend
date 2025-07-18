import { Request, Response } from 'express';
import {getUserSubscriptions} from '../services/subscriptionService';
import { AuthenticatedRequest } from '../types/express';
import Subscription from '../models/subscription';
import mongoose from 'mongoose';


export const getUserSubscriptionsController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID missing' });
    }

    const subscriptions = await getUserSubscriptions(userId);
    res.status(200).json({ message: 'Fetched subscriptions successfully', subscriptions });
  } catch (error) {
    const err = error as Error;
    console.error('Get Subscriptions Error:', err);
    res.status(500).json({ message: `Failed to fetch subscriptions: ${err.message}` });
  }
};

// export const pauseAllSubscriptionsController = async (req: AuthenticatedRequest, res: Response) => {
//   try {
//     const userId = req.userId;
//     if (!userId) {
//       return res.status(401).json({ message: 'Unauthorized: user ID missing' });
//     }

//     const result = await pauseAllSubscriptions(userId);
//     res.status(200).json(result);
//   } catch (error) {
//     const err = error as Error;
//     console.error('Pause Subscriptions Error:', err);
//     res.status(500).json({ message: `Failed to pause subscriptions: ${err.message}` });
//   }
// };

export const webhookController = async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;
    console.log('Webhook received:', JSON.stringify({ event, payload }, null, 2));

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
    const err = error as Error;
    console.error('Webhook Error:', err);
    res.status(500).json({ message: `Webhook processing failed: ${err.message}` });
  }
};