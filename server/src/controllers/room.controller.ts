import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Room } from '../models/room.model.js';
import { User } from '../models/user.model.js';

// Получить все активные комнаты
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .sort({ lastActivity: -1 })
      .populate('createdBy', 'username')
      .select('name code emoji description createdBy createdAt lastActivity settings');

    console.log('Rooms from DB before formatting:', JSON.stringify(rooms.map(r => ({
      _id: r._id,
      createdBy: r.createdBy
    })), null, 2));

    // Преобразуем данные для отправки на клиент
    const formattedRooms = rooms.map(room => {
      const creator = room.createdBy as any; // Используем any для доступа к полям
      console.log('Creator info:', JSON.stringify(creator, null, 2));
      
      return {
        id: room._id,
        name: room.name,
        code: room.code,
        emoji: room.emoji,
        description: room.description,
        createdBy: {
          id: creator._id,
          name: creator.username || 'Неизвестный пользователь' // Используем username вместо name
        },
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        settings: room.settings
      };
    });

    return res.status(200).json({ rooms: formattedRooms });
  } catch (error) {
    console.error('Ошибка при получении комнат:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении комнат' });
  }
};

// Создать новую комнату
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { name, description, settings, emoji } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Имя комнаты обязательно' });
    }

    // Проверяем наличие авторизации и получаем id пользователя
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }
    
    const userId = req.user.id;
    const user = await User.findById(userId).select('username');

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const newRoom = await Room.create({
      name,
      description,
      emoji,
      createdBy: new mongoose.Types.ObjectId(userId),
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      settings
    });

    return res.status(201).json({ 
      room: {
        id: newRoom._id,
        name: newRoom.name,
        code: newRoom.code,
        emoji: newRoom.emoji,
        description: newRoom.description,
        createdBy: {
          id: user._id,
          name: user.username // Используем username вместо name
        },
        createdAt: newRoom.createdAt,
        lastActivity: newRoom.lastActivity,
        settings: newRoom.settings
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
    }).populate('createdBy', 'username');

    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    const creator = room.createdBy as any; // Используем any для доступа к полям

    return res.status(200).json({ 
      room: {
        id: room._id,
        name: room.name,
        code: room.code,
        emoji: room.emoji,
        description: room.description,
        createdBy: {
          id: creator._id,
          name: creator.username // Используем username вместо name
        },
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        settings: room.settings
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
      { $set: { lastActivity: new Date() } }
    );
    
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении активности комнаты:', error);
    return false;
  }
};

// Обновить информацию о комнате
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { name, description, emoji, settings } = req.body;

    console.log('[updateRoom] Запрос на обновление комнаты:', {
      roomId,
      userId: req.user?.id,
      body: req.body
    });

    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: 'Некорректный ID комнаты' });
    }

    // Проверяем наличие авторизации и получаем id пользователя
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Необходима авторизация' });
    }
    
    const userId = req.user.id;

    // Проверяем, является ли пользователь создателем комнаты
    const room = await Room.findById(roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Комната не найдена' });
    }

    // Логируем ID для отладки
    console.log('[updateRoom] Сравнение ID:', {
      createdById: room.createdBy.toString(), // Здесь будет ObjectId, не популированный объект
      userId: userId
    });

    // Прямое сравнение ObjectId с userId
    const createdByIdStr = room.createdBy.toString();
    const userIdStr = userId.toString();
    
    const isCreator = createdByIdStr === userIdStr;
    
    console.log('[updateRoom] Результат проверки создателя:', {
      createdByIdStr,
      userIdStr,
      isCreator
    });

    if (!isCreator) {
      return res.status(403).json({ message: 'У вас нет прав на редактирование этой комнаты' });
    }

    // Обновляем только разрешенные поля
    const updatedFields: any = {};
    
    if (name) updatedFields.name = name;
    if (description !== undefined) updatedFields.description = description;
    if (emoji !== undefined) updatedFields.emoji = emoji;
    if (settings) {
      updatedFields.settings = {
        ...room.settings,
        ...settings
      };
    }

    // Обновляем комнату
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      { $set: updatedFields },
      { new: true }
    ).populate('createdBy', 'username');

    if (!updatedRoom) {
      return res.status(404).json({ message: 'Комната не найдена после обновления' });
    }

    const creator = updatedRoom.createdBy as any; // Используем any для доступа к полям

    return res.status(200).json({ 
      room: {
        id: updatedRoom._id,
        name: updatedRoom.name,
        code: updatedRoom.code,
        emoji: updatedRoom.emoji,
        description: updatedRoom.description,
        createdBy: {
          id: creator._id,
          name: creator.username // Используем username вместо name
        },
        createdAt: updatedRoom.createdAt,
        lastActivity: updatedRoom.lastActivity,
        settings: updatedRoom.settings
      }
    });
  } catch (error) {
    console.error('Ошибка при обновлении комнаты:', error);
    return res.status(500).json({ message: 'Ошибка сервера при обновлении комнаты' });
  }
}; 