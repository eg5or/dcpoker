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

/**
 * Проверяет токен, но не блокирует запрос, если токен отсутствует
 * Используется для эндпоинтов, которые могут работать и без авторизации
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Получаем токен из заголовка
    const authHeader = req.headers.authorization;

    // Если токена нет, просто пропускаем запрос дальше
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];

    // Проверяем и декодируем токен
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as { id: string; email: string; name: string };

    // Добавляем пользователя в request, если токен валидный
    if (decoded) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    // При ошибке просто пропускаем дальше без пользователя
    console.error('Ошибка проверки токена (опциональная авторизация):', error);
    next();
  }
};
