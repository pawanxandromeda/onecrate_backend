import { Request, Response } from 'express';
import { loginUser, registerUser, googleLogin } from '../services/auth.service';

export const signup = async (req: Request, res: Response) => {
  try {
    const { token, user } = await registerUser(req.body);
    res.status(201).json({ token, user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { token, user } = await loginUser(req.body.email, req.body.password);
    res.status(200).json({ token, user });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

export const loginWithGoogle = async (req: Request, res: Response) => {
  try {
    console.log("Google Login Request Body:", req.body); // ✅ log incoming data

    const { credential } = req.body;

    if (!credential) {
      console.error("Missing credential in request body");
      return res.status(400).json({ message: 'Missing Google credential' });
    }

    const { token, user } = await googleLogin(credential);
    res.status(200).json({ token, user });
  } catch (err: any) {
    console.error("Google Login Failed:", err.message); // ✅ log actual issue
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};
