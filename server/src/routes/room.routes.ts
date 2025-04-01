import express from 'express';
import { createRoom, getAllRooms, getRoomById } from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Все маршруты защищены авторизацией
router.use(authMiddleware);

// Получение списка всех комнат
router.get('/', getAllRooms);

// Создание новой комнаты
router.post('/', createRoom);

// Получение информации о комнате по ID
router.get('/:roomId', getRoomById);

export default router; 