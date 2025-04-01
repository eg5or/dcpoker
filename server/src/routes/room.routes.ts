import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware.js';
import { RoomInterface } from '../models/room.model.js';
import { RoomService } from '../services/room.service.js';

const router = express.Router();

/**
 * Создание новой комнаты
 * POST /api/rooms
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, settings, code, emoji } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Название комнаты обязательно' });
    }

    const room = await RoomService.createRoom(name, userId, description, settings, code, emoji);
    res.status(201).json({ room });
  } catch (error) {
    console.error('Ошибка при создании комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера при создании комнаты' });
  }
});

/**
 * Получение списка комнат
 * GET /api/rooms
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }
    
    // Получаем все активные комнаты вместо только созданных пользователем
    const rooms = await RoomService.getAllActiveRooms();
    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Ошибка при получении списка комнат:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении комнат' });
  }
});

/**
 * Получение комнаты по коду
 * GET /api/rooms/code/:code
 */
router.get('/code/:code', optionalAuthMiddleware, async (req, res) => {
  try {
    const { code } = req.params;
    const room = await RoomService.getRoomByCode(code);

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    // Если пользователь авторизован, обновляем время активности комнаты
    if (req.user?.id) {
      const roomId = (room as RoomInterface & { _id: mongoose.Types.ObjectId })._id.toString();
      await RoomService.updateLastActivity(roomId);
    }

    res.status(200).json(room);
  } catch (error) {
    console.error('Ошибка при получении комнаты по коду:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении комнаты' });
  }
});

/**
 * Обновление настроек комнаты
 * PUT /api/rooms/:id/settings
 */
router.put('/:id/settings', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { settings } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    // Проверка, есть ли такая комната и принадлежит ли она пользователю
    const rooms = await RoomService.getRoomsByUserId(userId);
    const room = rooms.find((r) => {
      const roomWithId = r as RoomInterface & { _id: mongoose.Types.ObjectId };
      return roomWithId._id.toString() === id;
    });

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена или нет прав доступа' });
    }

    const updatedRoom = await RoomService.updateRoomSettings(id, settings);
    res.status(200).json(updatedRoom);
  } catch (error) {
    console.error('Ошибка при обновлении настроек комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении комнаты' });
  }
});

/**
 * Деактивация комнаты
 * DELETE /api/rooms/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    // Проверка, есть ли такая комната и принадлежит ли она пользователю
    const rooms = await RoomService.getRoomsByUserId(userId);
    const room = rooms.find((r) => {
      const roomWithId = r as RoomInterface & { _id: mongoose.Types.ObjectId };
      return roomWithId._id.toString() === id;
    });

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена или нет прав доступа' });
    }

    await RoomService.deactivateRoom(id);
    res.status(200).json({ message: 'Комната успешно деактивирована' });
  } catch (error) {
    console.error('Ошибка при деактивации комнаты:', error);
    res.status(500).json({ message: 'Ошибка сервера при деактивации комнаты' });
  }
});

export default router; 