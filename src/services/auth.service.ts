import { User } from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateToken } from '../utils/jwt';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const registerUser = async (data: any) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new Error('Email already exists');

  const hashed = await hashPassword(data.password);
  const user = await User.create({ ...data, password: hashed });

const userObj = { ...user } as { [key: string]: any };
  delete userObj.password;

  return {
    token: generateToken(user._id.toString()),
    user: userObj,
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('Invalid email or password');

  const valid = await comparePassword(password, user.password);
  if (!valid) throw new Error('Invalid email or password');

 const userObj = { ...user } as { [key: string]: any };
  delete userObj.password;

  return {
    token: generateToken(user._id.toString()),
    user: userObj,
  };
};

export const googleLogin = async (credential: string) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new Error('Invalid Google credentials');

  let user = await User.findOne({ email: payload.email });

  if (!user) {
    user = await User.create({
      fullName: payload.name,
      email: payload.email,
      phone: '',
      password: 'google-auth', // dummy value
    });
  }

 const userObj = { ...user } as { [key: string]: any };
  delete userObj.password;

  return {
    token: generateToken(user._id.toString()),
    user: userObj,
  };
};
