import mongoose from 'mongoose';
import { Room, RoomInterface } from '../models/room.model.js';
import { User } from '../models/user.model.js';

export class RoomService {
  /**
   * Создает новую комнату
   */
  static async createRoom(
    name: string,
    userId: string,
    description?: string,
    settings?: {
      votingSequence?: number[];
      allowObservers?: boolean;
      autoReveal?: boolean;
    },
    code?: string,
    emoji?: string
  ): Promise<RoomInterface> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const room = new Room({
      name,
      description,
      code,
      emoji,
      createdBy: new mongoose.Types.ObjectId(userId),
      settings,
    });

    await room.save();
    return room;
  }

  /**
   * Получает комнату по коду
   */
  static async getRoomByCode(code: string): Promise<RoomInterface | null> {
    return Room.findOne({ code, isActive: true });
  }

  /**
   * Получает список комнат, созданных пользователем
   */
  static async getRoomsByUserId(userId: string): Promise<RoomInterface[]> {
    return Room.find({ 
      createdBy: new mongoose.Types.ObjectId(userId),
      isActive: true 
    }).sort({ lastActivity: -1 });
  }

  /**
   * Обновляет время последней активности комнаты
   */
  static async updateLastActivity(roomId: string): Promise<void> {
    await Room.findByIdAndUpdate(roomId, { 
      lastActivity: new Date() 
    });
  }

  /**
   * Обновляет настройки комнаты
   */
  static async updateRoomSettings(
    roomId: string,
    settings: {
      votingSequence?: number[];
      allowObservers?: boolean;
      autoReveal?: boolean;
    }
  ): Promise<RoomInterface | null> {
    return Room.findByIdAndUpdate(
      roomId,
      { 
        $set: { settings },
        lastActivity: new Date()
      },
      { new: true }
    );
  }

  /**
   * Деактивирует комнату
   */
  static async deactivateRoom(roomId: string): Promise<void> {
    await Room.findByIdAndUpdate(roomId, { isActive: false });
  }

  /**
   * Проверяет, существует ли комната с данным кодом
   */
  static async roomExists(code: string): Promise<boolean> {
    const room = await Room.findOne({ code, isActive: true });
    return !!room;
  }

  /**
   * Получает список всех активных комнат
   */
  static async getAllActiveRooms(): Promise<RoomInterface[]> {
    return Room.find({ 
      isActive: true 
    }).sort({ lastActivity: -1 });
  }
} 