import { GlobalStats, UserStats } from '../types/stats';
import { authService } from './auth.service';

class StatsService {
  private readonly API_URL: string;
  
  constructor() {
    this.API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    console.log('📊 Stats Service использует API URL:', this.API_URL);
  }
  
  /**
   * Получить статистику текущего пользователя
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Не авторизован');
      }
      
      const response = await fetch(`${this.API_URL}/stats/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при получении статистики');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      throw error;
    }
  }
  
  /**
   * Получить статистику пользователя по ID
   */
  async getUserStatsById(userId: string): Promise<UserStats> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Не авторизован');
      }
      
      const response = await fetch(`${this.API_URL}/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при получении статистики');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      throw error;
    }
  }
  
  /**
   * Получить общую статистику
   */
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('Не авторизован');
      }
      
      const response = await fetch(`${this.API_URL}/stats/global`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при получении статистики');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении общей статистики:', error);
      throw error;
    }
  }
}

export const statsService = new StatsService(); 