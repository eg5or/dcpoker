import dotenv from 'dotenv';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { UserDocument } from '../models/user.model.js';

dotenv.config();

// Определяем переменные окружения
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const generateToken = (user: UserDocument): string => {
  const payload = { 
    id: user._id, 
    login: user.login,
    name: user.username 
  };
  
  // @ts-ignore - игнорируем проблему типизации jwt.sign
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
};

export default { generateToken, verifyToken }; 