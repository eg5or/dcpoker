import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Room } from '../models/room.model.js';

// Получить все активные комнаты
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .sort({ lastActivityAt: -1 })
      .select('name emoji createdAt lastActivityAt');

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('Ошибка при получении комнат:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении комнат' });
  }
};

// Создать новую комнату
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, emoji } = req.body;

    if (!name || !emoji) {
      return res.status(400).json({ message: 'Имя и эмодзи комнаты обязательны' });
    }

    // @ts-ignore - userId добавляется в middleware авторизации
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }

    const newRoom = await Room.create({
      name,
      emoji,
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
      lastActivityAt: new Date(),
      isActive: true,
    });

    return res.status(201).json({ 
      room: {
        id: newRoom._id,
        name: newRoom.name,
        emoji: newRoom.emoji,
        createdAt: newRoom.createdAt,
        lastActivityAt: newRoom.lastActivityAt,
      }
    });
  } catch (error) {
    console.error('Ошибка при создании комнаты:', error);
    return res.status(500).json({ message: 'Ошибка сервера при создании комнаты' });
  }
};

// Получить информацию о комнате по ID
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Некорректный ID комнаты' });
    }

    const room = await Room.findOne({ 
      _id: new mongoose.Types.ObjectId(roomId),
      isActive: true 
    });

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    return res.status(200).json({ 
      room: {
        id: room._id,
        name: room.name,
        emoji: room.emoji,
        createdAt: room.createdAt,
        lastActivityAt: room.lastActivityAt,
      }
    });
  } catch (error) {
    console.error('Ошибка при получении комнаты:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении комнаты' });
  }
};

// Обновить время последней активности в комнате
export const updateRoomActivity = async (roomId: string) => {
  try {
    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return false;
    }
    
    await Room.updateOne(
      { _id: new mongoose.Types.ObjectId(roomId) },
      { $set: { lastActivityAt: new Date() } }
    );
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении активности комнаты:', error);
    return false;
  }
}; 