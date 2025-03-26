import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../config/jwt';

// Расширяем интерфейс Request для добавления информации о пользователе
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Получаем заголовок авторизации
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Не авторизован: отсутствует токен' });
      return;
    }

    // Извлекаем токен
    const token = authHeader.split(' ')[1];
    
    // Проверяем токен
    const decoded = verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({ message: 'Не авторизован: недействительный токен' });
      return;
    }

    // Добавляем информацию о пользователе в объект запроса
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(401).json({ message: 'Не авторизован: ошибка проверки токена' });
  }
}; 