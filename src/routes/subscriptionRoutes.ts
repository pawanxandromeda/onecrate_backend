// Backend: subscriptionRoutes.ts
import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { getUserSubscriptionsController, webhookController } from '../controllers/subscriptionController';
//import { pauseAllSubscriptionsController } from '../controllers/subscriptionController';

const router = Router();

// router.post('/subscriptions', verifyToken, createSubscriptionController);
// router.post('/subscriptions/verify-payment', verifyPaymentController);
router.get('/subscriptionsget', verifyToken, getUserSubscriptionsController);
//router.post('/pause', verifyToken, pauseAllSubscriptionsController);
router.post('/webhook', webhookController); // New webhook endpoint for Razorpay

export default router;