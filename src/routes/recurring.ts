import express from 'express';
import { verifyToken } from '../middleware/auth';
import {
  createRecurringOrder,
  verifyRecurringPayment,
} from '../controllers/recurringController';

const router = express.Router();

router.post('/recurring-order', verifyToken, createRecurringOrder);
router.post('/recurring-verify', verifyToken, verifyRecurringPayment);

export default router;
