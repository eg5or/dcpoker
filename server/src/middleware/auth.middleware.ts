import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

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
    // Получаем токен из заголовка
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Не авторизован: отсутствует токен' });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Проверяем и декодируем токен
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string; name: string };
    
    if (!decoded) {
      res.status(401).json({ message: 'Не авторизован: недействительный токен' });
      return;
    }
    
    // Добавляем пользователя в request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('Ошибка аутентификации:', error);
    res.status(401).json({ message: 'Не авторизован: ошибка проверки токена' });
  }
}; 