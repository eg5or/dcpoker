import { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service.js';

export class UserSettingsController {
  /**
   * Получить настройки пользователя
   */
  static async getUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({ message: 'ID пользователя не указан' });
        return;
      }
      
      const settings = await SettingsService.getUserSettings(userId);
      res.status(200).json(settings);
    } catch (error) {
      console.error('Ошибка при получении настроек пользователя:', error);
      res.status(500).json({ message: 'Ошибка при получении настроек пользователя' });
    }
  }
  
  /**
   * Обновить настройки пользователя
   */
  static async updateUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({ message: 'ID пользователя не указан' });
        return;
      }
      
      const settingsData = req.body;
      const settings = await SettingsService.updateUserSettings(userId, settingsData);
      res.status(200).json(settings);
    } catch (error) {
      console.error('Ошибка при обновлении настроек пользователя:', error);
      res.status(500).json({ message: 'Ошибка при обновлении настроек пользователя' });
    }
  }
  
  /**
   * Добавить эмодзи в избранное
   */
  static async addFavoriteEmoji(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({ message: 'ID пользователя не указан' });
        return;
      }
      
      const { emoji } = req.body;
      
      if (!emoji) {
        res.status(400).json({ message: 'Эмодзи не указан' });
        return;
      }
      
      const settings = await SettingsService.addFavoriteEmoji(userId, emoji);
      res.status(200).json(settings);
    } catch (error) {
      console.error('Ошибка при добавлении эмодзи в избранное:', error);
      res.status(500).json({ message: 'Ошибка при добавлении эмодзи в избранное' });
    }
  }
  
  /**
   * Удалить эмодзи из избранного
   */
  static async removeFavoriteEmoji(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(400).json({ message: 'ID пользователя не указан' });
        return;
      }
      
      const { emoji } = req.params;
      
      if (!emoji) {
        res.status(400).json({ message: 'Эмодзи не указан' });
        return;
      }
      
      const settings = await SettingsService.removeFavoriteEmoji(userId, emoji);
      res.status(200).json(settings);
    } catch (error) {
      console.error('Ошибка при удалении эмодзи из избранного:', error);
      res.status(500).json({ message: 'Ошибка при удалении эмодзи из избранного' });
    }
  }
} 