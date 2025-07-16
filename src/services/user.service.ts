import { User } from '../models/user.model';

export const getUserById = async (userId: string) => {
  const user = await User.findById(userId).select('-password');
  return user;
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
  if (!user) throw new Error('User not found');
  return user;
};