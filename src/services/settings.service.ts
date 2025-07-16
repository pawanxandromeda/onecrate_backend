import { Settings } from '../models/settings.model';

export const getSettingsByUser = async (userId: string) => {
  let settings = await Settings.findOne({ userId });
  if (!settings) {
    settings = await Settings.create({ userId });
  }
  return settings;
};

export const updateNotificationSettings = async (userId: string, preferences: any) => {
  return await Settings.findOneAndUpdate(
    { userId },
    { notificationPreferences: preferences },
    { new: true, upsert: true }
  );
};

export const addOrUpdateDeliveryAddress = async (userId: string, address: any) => {
  const settings = await Settings.findOne({ userId });
  if (!settings) throw new Error("Settings not found");

  // Replace first address or push
  if (settings.deliveryAddresses.length > 0) {
    settings.deliveryAddresses[0] = address;
  } else {
    settings.deliveryAddresses.push(address);
  }

  return await settings.save();
};
