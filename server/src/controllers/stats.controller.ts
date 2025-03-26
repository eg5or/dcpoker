import { Request, Response } from 'express';
import { StatsService } from '../services/stats.service';

export class StatsController {
  /**
   * Получить статистику пользователя
   */
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({ message: 'ID пользователя не указан' });
        return;
      }
      
      const stats = await StatsService.getUserStats(userId);
      res.status(200).json(stats);
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      res.status(500).json({ message: 'Ошибка при получении статистики пользователя' });
    }
  }
  
  /**
   * Получить общую статистику
   */
  static async getGlobalStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await StatsService.getGlobalStats();
      res.status(200).json(stats);
    } catch (error) {
      console.error('Ошибка при получении общей статистики:', error);
      res.status(500).json({ message: 'Ошибка при получении общей статистики' });
    }
  }
} 