import { Router } from 'express';

import { verifyToken } from '../middleware/auth';
import { createSubscriptionController, getUserSubscriptionsController, verifyPaymentController } from '../controllers/subscriptionController';
import { pauseAllSubscriptionsController } from '../controllers/subscriptionController';


const router = Router();

router.post('/subscriptions', verifyToken, createSubscriptionController);
router.post('/subscriptions/verify-payment', verifyPaymentController);
router.get('/subscriptions', verifyToken, getUserSubscriptionsController);
router.post('/pause', verifyToken, pauseAllSubscriptionsController);

export default router;