import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import {
  getSettingsByUser,
  updateNotificationSettings,
  addOrUpdateDeliveryAddress
} from '../services/settings.service';
import { pauseAllSubscriptions } from '../services/subscriptionService';

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const settings = await getSettingsByUser(userId);
  res.json(settings);
};

export const updateNotifications = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const updated = await updateNotificationSettings(userId, req.body);
  res.json(updated);
};

export const saveDeliveryAddress = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const address = req.body;
  const updated = await addOrUpdateDeliveryAddress(userId, address);
  res.json(updated);
};

