import { Request, Response } from 'express';
import { SessionService } from '../services/session.service.js';

export class SessionController {
  /**
   * Создать новую сессию голосования
   */
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { title } = req.body;
      const session = await SessionService.createSession(userId, title);
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Ошибка при создании сессии голосования:', error);
      res.status(500).json({ message: 'Ошибка при создании сессии голосования' });
    }
  }
  
  /**
   * Получить активную сессию пользователя
   */
  static async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const session = await SessionService.getActiveSession(userId);
      
      if (!session) {
        res.status(404).json({ message: 'Активной сессии не найдено' });
        return;
      }
      
      res.status(200).json(session);
    } catch (error) {
      console.error('Ошибка при получении активной сессии:', error);
      res.status(500).json({ message: 'Ошибка при получении активной сессии' });
    }
  }
  
  /**
   * Добавить участника в сессию
   */
  static async addParticipant(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const username = req.user?.name || 'Пользователь';
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.status(400).json({ message: 'ID сессии не указан' });
        return;
      }
      
      const session = await SessionService.addParticipant(sessionId, userId, username);
      res.status(200).json(session);
    } catch (error) {
      console.error('Ошибка при добавлении участника в сессию:', error);
      res.status(500).json({ message: 'Ошибка при добавлении участника в сессию' });
    }
  }
  
  /**
   * Добавить голос участника
   */
  static async addVote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const username = req.user?.name || 'Пользователь';
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { sessionId } = req.params;
      const { vote } = req.body;
      
      if (!sessionId) {
        res.status(400).json({ message: 'ID сессии не указан' });
        return;
      }
      
      if (vote === undefined || vote === null) {
        res.status(400).json({ message: 'Голос не указан' });
        return;
      }
      
      const session = await SessionService.addVote(sessionId, userId, username, vote);
      res.status(200).json(session);
    } catch (error) {
      console.error('Ошибка при добавлении голоса:', error);
      res.status(500).json({ message: 'Ошибка при добавлении голоса' });
    }
  }
  
  /**
   * Раскрыть карты в сессии
   */
  static async revealVotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.status(400).json({ message: 'ID сессии не указан' });
        return;
      }
      
      const session = await SessionService.revealVotes(sessionId);
      res.status(200).json(session);
    } catch (error) {
      console.error('Ошибка при раскрытии карт:', error);
      res.status(500).json({ message: 'Ошибка при раскрытии карт' });
    }
  }
  
  /**
   * Завершить сессию голосования
   */
  static async completeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.status(400).json({ message: 'ID сессии не указан' });
        return;
      }
      
      const session = await SessionService.completeSession(sessionId);
      res.status(200).json(session);
    } catch (error) {
      console.error('Ошибка при завершении сессии:', error);
      res.status(500).json({ message: 'Ошибка при завершении сессии' });
    }
  }
  
  /**
   * Добавить эмодзи, брошенный в сессии
   */
  static async addEmoji(req: Request, res: Response): Promise<void> {
    try {
      const senderId = req.user?.id;
      const senderName = req.user?.name || 'Пользователь';
      
      if (!senderId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { sessionId } = req.params;
      const { targetId, targetName, emoji } = req.body;
      
      if (!sessionId) {
        res.status(400).json({ message: 'ID сессии не указан' });
        return;
      }
      
      if (!targetId || !targetName || !emoji) {
        res.status(400).json({ message: 'Не все параметры указаны' });
        return;
      }
      
      const session = await SessionService.addEmoji(
        sessionId, 
        senderId, 
        senderName, 
        targetId, 
        targetName, 
        emoji
      );
      
      res.status(200).json(session);
    } catch (error) {
      console.error('Ошибка при добавлении эмодзи:', error);
      res.status(500).json({ message: 'Ошибка при добавлении эмодзи' });
    }
  }
  
  /**
   * Получить историю сессий пользователя
   */
  static async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await SessionService.getUserSessions(userId, page, limit);
      res.status(200).json(result);
    } catch (error) {
      console.error('Ошибка при получении истории сессий:', error);
      res.status(500).json({ message: 'Ошибка при получении истории сессий' });
    }
  }
  
  /**
   * Получить статистику сессии
   */
  static async getSessionStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ message: 'Пользователь не авторизован' });
        return;
      }
      
      const { sessionId } = req.params;
      
      if (!sessionId) {
        res.status(400).json({ message: 'ID сессии не указан' });
        return;
      }
      
      const stats = await SessionService.getSessionStats(sessionId);
      res.status(200).json(stats);
    } catch (error) {
      console.error('Ошибка при получении статистики сессии:', error);
      res.status(500).json({ message: 'Ошибка при получении статистики сессии' });
    }
  }
} 