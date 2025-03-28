import express from 'express';
import { StatsController } from '../controllers/stats.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Маршруты, требующие авторизации
router.use(authMiddleware);

// Маршрут для получения общей статистики
router.get('/global', StatsController.getGlobalStats);

// Маршрут для получения статистики текущего пользователя
router.get('/me', StatsController.getUserStats);

// Маршрут для получения статистики конкретного пользователя
router.get('/:userId', StatsController.getUserStats);

export default router; 