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
    })
    .sort({ lastActivity: -1 })
    .populate('createdBy', 'username')
    .exec();
  }

  /**
   * Получает комнату по ID
   * Возвращает комнату без populate, чтобы не было проблем с проверкой создателя комнаты
   */
  static async getRoomById(roomId: string): Promise<RoomInterface | null> {
    console.log('[RoomService.getRoomById] Запрос комнаты по ID:', roomId);
    
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      console.log('[RoomService.getRoomById] ID не валиден');
      return null;
    }
    
    try {
      // Ищем комнату БЕЗ populate для проверки прав доступа
      const room = await Room.findOne({ 
        _id: new mongoose.Types.ObjectId(roomId),
        isActive: true 
      });
      
      if (room) {
        console.log('[RoomService.getRoomById] Найдена комната, createdBy:', 
          room.createdBy,
          'тип:', typeof room.createdBy
        );
      } else {
        console.log('[RoomService.getRoomById] Комната не найдена');
      }
      
      return room;
    } catch (error) {
      console.error('[RoomService.getRoomById] Ошибка при поиске комнаты:', error);
      return null;
    }
  }

  /**
   * Обновляет информацию о комнате
   */
  static async updateRoom(
    roomId: string,
    data: {
      name?: string;
      description?: string;
      emoji?: string;
      settings?: {
        votingSequence?: number[];
        allowObservers?: boolean;
        autoReveal?: boolean;
      };
    }
  ): Promise<RoomInterface | null> {
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return null;
    }

    // Подготавливаем объект с обновлениями
    const updates: any = { lastActivity: new Date() };

    if (data.name) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.emoji !== undefined) updates.emoji = data.emoji;

    // Если есть настройки, сначала получим текущие, чтобы объединить их
    if (data.settings) {
      const room = await Room.findById(roomId);
      if (room) {
        updates.settings = {
          ...(room.settings || {}),
          ...data.settings
        };
      }
    }

    // Обновляем комнату без populate для внутреннего использования
    return Room.findByIdAndUpdate(
      roomId,
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Получает комнату по ID с деталями пользователя (для отображения)
   */
  static async getRoomDetails(roomId: string): Promise<RoomInterface | null> {
    console.log('[RoomService.getRoomDetails] Запрос комнаты с деталями по ID:', roomId);
    
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return null;
    }
    
    try {
      const room = await Room.findOne({ 
        _id: new mongoose.Types.ObjectId(roomId),
        isActive: true 
      }).populate('createdBy', 'username').exec();
      
      return room;
    } catch (error) {
      console.error('[RoomService.getRoomDetails] Ошибка при поиске комнаты:', error);
      return null;
    }
  }
} 