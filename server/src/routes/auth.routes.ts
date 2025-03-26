import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Middleware для логирования запросов
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Request body:', req.body);
  next();
});

// Маршруты для аутентификации
router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router; 