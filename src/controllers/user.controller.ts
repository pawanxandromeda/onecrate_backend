import { Request, Response } from 'express';
import { getUserById, updateUserProfile } from '../services/user.service';

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      address: user.address || {
        houseNo: '',
        street: '',
        landmark: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      memberSince: user.createdAt.toISOString().split('T')[0],
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { fullName, phone, address } = req.body;
    const updated = await updateUserProfile(userId, { fullName, phone, address });

    res.status(200).json({
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone || '',
      address: updated.address || {
        houseNo: '',
        street: '',
        landmark: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      memberSince: updated.createdAt.toISOString().split('T')[0],
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};