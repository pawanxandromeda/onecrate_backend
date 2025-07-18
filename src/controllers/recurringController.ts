// import section same
import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import Subscription from '../models/subscription';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Create order for dynamic kit
export const createRecurringOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const data = req.body;

    const grandTotal = data.grandTotal;
    if (!grandTotal || grandTotal < 1) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount: grandTotal * 100,
      currency: 'INR',
      receipt: `recurring_${Date.now()}`,
      payment_capture: true,
      notes: {
        userId,
        subscriptionName: data.subscriptionName,
      },
    });

    const subscription = new Subscription({
      ...data,
      userId,
      paymentStatus: 'pending',
      status: 'active',
      razorpayOrderId: order.id,
    });

    await subscription.save();

    res.status(200).json({
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

// Verify payment and save token for future charges
export const verifyRecurringPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    const updated = await Subscription.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        paymentStatus: 'completed',
        razorpayTokenId: payment.token_id, // ✅ Save token for autopay
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Subscription not found' });

    res.json({ message: 'Subscription activated', subscription: updated });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};
