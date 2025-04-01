import { Room } from '../types';
import { authService } from './auth.service';

// Используем относительный путь для доступа к API через nginx proxy
const API_URL = '/api';

// Константа для ключа в localStorage для сохранения последней комнаты
const LAST_ROOM_KEY = 'scrum_poker_last_room';

class RoomService {
  // Получить все доступные комнаты
  async getAllRooms(): Promise<Room[]> {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка при получении списка комнат');
      }

      const data = await response.json();
      return data.rooms || [];
    } catch (error) {
      console.error('Ошибка при получении комнат:', error);
      return [];
    }
  }

  // Создать новую комнату
  async createRoom(name: string, description?: string, settings?: object, code?: string, emoji?: string): Promise<Room | null> {
    try {
      const reqCode = code || this.generateRoomCode();
      console.log('Создание комнаты с кодом:', reqCode);

      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({ 
          name, 
          description, 
          settings,
          code: reqCode,
          emoji 
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при создании комнаты');
      }

      const data = await response.json();
      return data.room;
    } catch (error) {
      console.error('Ошибка при создании комнаты:', error);
      return null;
    }
  }

  // Получить информацию о комнате по коду
  async getRoomByCode(code: string): Promise<Room | null> {
    try {
      const response = await fetch(`${API_URL}/rooms/code/${code}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка при получении информации о комнате');
      }

      const data = await response.json();
      return data.room;
    } catch (error) {
      console.error('Ошибка при получении информации о комнате:', error);
      return null;
    }
  }

  // Получить информацию о комнате по ID
  async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка при получении информации о комнате');
      }

      const data = await response.json();
      return data.room;
    } catch (error) {
      console.error('Ошибка при получении информации о комнате:', error);
      return null;
    }
  }

  // Сохранить ID последней комнаты в localStorage
  saveLastRoom(roomId: string): void {
    try {
      console.log('[RoomService] Сохранение ID комнаты в localStorage:', roomId);
      localStorage.setItem(LAST_ROOM_KEY, roomId);
      
      // Проверка, что значение сохранилось правильно
      const savedValue = localStorage.getItem(LAST_ROOM_KEY);
      if (savedValue !== roomId) {
        console.error('[RoomService] Ошибка при сохранении ID комнаты:', 
                     'ожидалось:', roomId, 
                     'получено:', savedValue);
      } else {
        console.log('[RoomService] ID комнаты успешно сохранен');
      }
    } catch (error) {
      console.error('[RoomService] Ошибка при сохранении ID комнаты в localStorage:', error);
    }
  }

  // Получить ID последней комнаты из localStorage
  getLastRoom(): string | null {
    try {
      const roomId = localStorage.getItem(LAST_ROOM_KEY);
      console.log('[RoomService] Получен ID последней комнаты из localStorage:', roomId);
      return roomId;
    } catch (error) {
      console.error('[RoomService] Ошибка при получении ID комнаты из localStorage:', error);
      return null;
    }
  }

  // Генерация случайного кода комнаты
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const roomService = new RoomService(); 