import { Request, Response } from 'express';
import Subscription from '../models/subscription';
import mongoose from 'mongoose';
import crypto from 'crypto';

export const webhookController = async (req: Request, res: Response) => {
  try {
    // Validate webhook secret
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('Razorpay webhook secret is missing in environment variables');
    }

    // Verify webhook signature
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (webhookSignature !== generatedSignature) {
      console.error('Invalid webhook signature:', { received: webhookSignature, expected: generatedSignature });
      throw new Error('Invalid webhook signature');
    }

    const { event, payload } = req.body;
    console.log('Webhook received:', JSON.stringify({ event, payload }, null, 2));

    if (event === 'subscription.charged') {
      const { subscription, payment } = payload;
      const subscriptionId = subscription.id;
      const amount = payment.amount / 100; // Convert paise to rupees

      // Find the original subscription
      const existingSubscription = await Subscription.findOne({ razorpaySubscriptionId: subscriptionId });
      if (!existingSubscription) {
        throw new Error(`Subscription not found for razorpaySubscriptionId: ${subscriptionId}`);
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
    console.error('Webhook Error:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(400).json({ message: err.message });
  }
};