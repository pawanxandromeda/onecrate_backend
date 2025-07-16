import express from 'express';
import {
  getSettings,
  updateNotifications,
  saveDeliveryAddress
} from '../controllers/settings.controller';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

router.get('/settings', verifyToken, getSettings);
router.put('/settings/notifications', verifyToken, updateNotifications);
router.put('/settings/delivery-address', verifyToken, saveDeliveryAddress);

export default router;
