import dotenv from 'dotenv';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { UserDocument } from '../models/user.model';

dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'supersecret_jwt_key';
const JWT_EXPIRES_IN = '7d';

export const generateToken = (user: UserDocument): string => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  
  return jwt.sign(
    { 
      id: user._id, 
      login: user.login,
      name: user.username 
    },
    JWT_SECRET,
    options
  );
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}; 