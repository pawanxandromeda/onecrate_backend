import { Request, Response } from 'express';
import Subscription from '../models/subscription';
import mongoose from 'mongoose';
import crypto from 'crypto';

export const webhookController = async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;
    console.log('Webhook received:', JSON.stringify({ event, payload }, null, 2));

    if (event === 'subscription.charged') {
      const { subscription, payment } = payload;
      const subscriptionId = subscription.id;
      const amount = payment.amount / 100; // Convert to rupees

      // Find the original subscription
      const existingSubscription = await Subscription.findOne({ 
        razorpaySubscriptionId: subscriptionId 
      });
      
      if (!existingSubscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Create a new subscription record for this payment
      const newSubscription = new Subscription({
        ...existingSubscription.toObject(),
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        paymentStatus: 'completed',
        paymentId: payment.id,
        nextBillingDate: new Date(subscription.current_end * 1000),
        status: 'active'
      });

      await newSubscription.save();
      console.log(`Recurring charge recorded for subscription: ${subscriptionId}`);
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    const err = error as Error;
    console.error('Webhook Error:', err);
    res.status(500).json({ message: `Webhook processing failed: ${err.message}` });
  }
};