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
      return data.rooms;
    } catch (error) {
      console.error('Ошибка при получении комнат:', error);
      return [];
    }
  }

  // Создать новую комнату
  async createRoom(name: string, emoji: string): Promise<Room | null> {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({ name, emoji }),
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
    localStorage.setItem(LAST_ROOM_KEY, roomId);
  }

  // Получить ID последней комнаты из localStorage
  getLastRoom(): string | null {
    return localStorage.getItem(LAST_ROOM_KEY);
  }
}

export const roomService = new RoomService(); 