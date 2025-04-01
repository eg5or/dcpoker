import mongoose from 'mongoose';
import { VotingSession } from '../models/session.model.js';
import { StatsService } from './stats.service.js';

// Интерфейсы для типизации
interface VoteStats {
  value: number;
  count: number;
}

interface EmojiStats {
  emoji: string;
  count: number;
}

export class SessionService {
  /**
   * Создать новую сессию голосования
   */
  static async createSession(creatorId: string, title?: string): Promise<any> {
    try {
      const session = await VotingSession.create({
        createdBy: new mongoose.Types.ObjectId(creatorId),
        title: title || 'Голосование',
        status: 'active',
        participants: [new mongoose.Types.ObjectId(creatorId)],
        wasRevealed: false,
        createdAt: new Date(),
      });

      return session;
    } catch (error) {
      console.error('Ошибка при создании сессии голосования:', error);
      throw error;
    }
  }

  /**
   * Получить активную сессию пользователя
   */
  static async getActiveSession(userId: string): Promise<any> {
    try {
      // Ищем сессию, где пользователь является участником и сессия активна
      const session = await VotingSession.findOne({
        participants: new mongoose.Types.ObjectId(userId),
        status: { $in: ['active', 'revealed'] },
      }).sort({ createdAt: -1 });

      return session;
    } catch (error) {
      console.error('Ошибка при получении активной сессии:', error);
      throw error;
    }
  }

  /**
   * Добавить участника в сессию
   */
  static async addParticipant(sessionId: string, userId: string, username: string): Promise<any> {
    try {
      const session = await VotingSession.findById(new mongoose.Types.ObjectId(sessionId));
      if (!session) {
        throw new Error('Сессия не найдена');
      }

      // Проверяем, есть ли пользователь уже в списке участников
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const userExists = session.participants.some(
        (id: mongoose.Types.ObjectId) => id.toString() === userObjectId.toString()
      );

      if (!userExists) {
        session.participants.push(userObjectId);
        await session.save();
      }

      return session;
    } catch (error) {
      console.error('Ошибка при добавлении участника в сессию:', error);
      throw error;
    }
  }

  /**
   * Добавить голос участника
   */
  static async addVote(
    sessionId: string,
    userId: string,
    username: string,
    vote: number
  ): Promise<any> {
    try {
      const session = await VotingSession.findById(new mongoose.Types.ObjectId(sessionId));
      if (!session) {
        throw new Error('Сессия не найдена');
      }

      // Проверяем, что сессия активна
      if (session.status === 'completed') {
        throw new Error('Сессия уже завершена');
      }

      // Проверяем, есть ли уже голос этого пользователя
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const existingVoteIndex = session.votes.findIndex(
        (v: any) => v.userId.toString() === userObjectId.toString()
      );

      if (existingVoteIndex !== -1) {
        // Обновляем существующий голос
        const existingVote = session.votes[existingVoteIndex];

        if (session.wasRevealed) {
          // Если карты уже раскрыты, отмечаем изменение после раскрытия
          if (existingVote.finalVote !== vote) {
            existingVote.finalVote = vote;
            existingVote.changedAfterReveal = true;
          }
        } else {
          // Если карты еще не раскрыты, обновляем начальный голос
          existingVote.initialVote = vote;
          existingVote.finalVote = vote;
          existingVote.votedAt = new Date();
        }
      } else {
        // Добавляем новый голос
        session.votes.push({
          userId: userObjectId,
          username,
          initialVote: vote,
          finalVote: vote,
          votedAt: new Date(),
          changedAfterReveal: false,
        });
      }

      await session.save();
      return session;
    } catch (error) {
      console.error('Ошибка при добавлении голоса:', error);
      throw error;
    }
  }

  /**
   * Раскрыть карты в сессии
   */
  static async revealVotes(sessionId: string): Promise<any> {
    try {
      const session = await VotingSession.findById(new mongoose.Types.ObjectId(sessionId));
      if (!session) {
        throw new Error('Сессия не найдена');
      }

      // Обновляем статус сессии
      session.status = 'revealed';
      session.wasRevealed = true;
      session.revealedAt = new Date();

      // Рассчитываем среднюю оценку
      const validVotes = session.votes.filter(
        (v: any) => v.initialVote !== null && typeof v.initialVote === 'number'
      );

      if (validVotes.length > 0) {
        const sum = validVotes.reduce((acc: number, v: any) => acc + v.initialVote, 0);
        session.averageVote = parseFloat((sum / validVotes.length).toFixed(2));

        // Определяем согласованность (логика может быть разной)
        session.consistency = calculateConsistency(validVotes.map((v: any) => v.initialVote));
      }

      await session.save();

      // Обновляем статистику голосования
      await StatsService.updateSessionStats(sessionId);

      return session;
    } catch (error) {
      console.error('Ошибка при раскрытии карт:', error);
      throw error;
    }
  }

  /**
   * Завершить сессию голосования
   */
  static async completeSession(sessionId: string): Promise<any> {
    try {
      const session = await VotingSession.findById(new mongoose.Types.ObjectId(sessionId));
      if (!session) {
        throw new Error('Сессия не найдена');
      }

      // Если сессия уже завершена, просто возвращаем ее
      if (session.status === 'completed') {
        return session;
      }

      // Раскрываем карты, если они еще не раскрыты
      if (!session.wasRevealed) {
        await this.revealVotes(sessionId);
      }

      // Обновляем статус сессии
      session.status = 'completed';
      session.completedAt = new Date();
      await session.save();

      return session;
    } catch (error) {
      console.error('Ошибка при завершении сессии:', error);
      throw error;
    }
  }

  /**
   * Добавить эмодзи, брошенный в сессии
   */
  static async addEmoji(
    sessionId: string,
    senderId: string,
    senderName: string,
    targetId: string,
    targetName: string,
    emoji: string
  ): Promise<any> {
    try {
      const session = await VotingSession.findById(new mongoose.Types.ObjectId(sessionId));
      if (!session) {
        throw new Error('Сессия не найдена');
      }

      // Добавляем запись о брошенном эмодзи
      session.emojis.push({
        senderId: new mongoose.Types.ObjectId(senderId),
        targetId: new mongoose.Types.ObjectId(targetId),
        senderName,
        targetName,
        emoji,
        thrownAt: new Date(),
      });

      await session.save();

      // Обновляем статистику эмодзи
      await StatsService.updateEmojiStats(senderId, targetId, emoji);

      return session;
    } catch (error) {
      console.error('Ошибка при добавлении эмодзи:', error);
      throw error;
    }
  }

  /**
   * Получить историю сессий пользователя
   */
  static async getUserSessions(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const sessions = await VotingSession.find({
        participants: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await VotingSession.countDocuments({
        participants: new mongoose.Types.ObjectId(userId),
      });

      return {
        sessions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Ошибка при получении истории сессий:', error);
      throw error;
    }
  }

  /**
   * Получить статистику сессии
   */
  static async getSessionStats(sessionId: string): Promise<any> {
    try {
      const session = await VotingSession.findById(new mongoose.Types.ObjectId(sessionId));
      if (!session) {
        throw new Error('Сессия не найдена');
      }

      // Собираем статистику по голосам
      const voteStats: VoteStats[] = [];
      if (session.votes.length > 0) {
        // Группируем голоса по значениям и считаем их количество
        const voteGroups: Record<number, number> = {};

        session.votes.forEach((v: any) => {
          const value = v.initialVote;
          if (value !== null && typeof value === 'number') {
            if (!voteGroups[value]) {
              voteGroups[value] = 0;
            }
            voteGroups[value]++;
          }
        });

        // Преобразуем объект группировки в массив
        for (const [valueStr, count] of Object.entries(voteGroups)) {
          const value = parseFloat(valueStr);
          voteStats.push({ value, count });
        }

        // Сортируем по значению
        voteStats.sort((a, b) => a.value - b.value);
      }

      // Собираем статистику по эмодзи
      const emojiStats: EmojiStats[] = [];
      if (session.emojis.length > 0) {
        // Группируем эмодзи по значениям и считаем их количество
        const emojiGroups: Record<string, number> = {};

        session.emojis.forEach((emojiObj: any) => {
          const value = emojiObj.emoji;
          if (!emojiGroups[value]) {
            emojiGroups[value] = 0;
          }
          emojiGroups[value]++;
        });

        // Преобразуем объект группировки в массив
        for (const [emoji, count] of Object.entries(emojiGroups)) {
          emojiStats.push({ emoji, count });
        }

        // Сортируем по количеству (по убыванию)
        emojiStats.sort((a, b) => b.count - a.count);
      }

      return {
        sessionId: session._id,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        revealedAt: session.revealedAt,
        completedAt: session.completedAt,
        participants: session.participants.length,
        votes: {
          total: session.votes.length,
          average: session.averageVote,
          consistency: session.consistency,
          stats: voteStats,
        },
        emojis: {
          total: session.emojis.length,
          stats: emojiStats,
        },
      };
    } catch (error) {
      console.error('Ошибка при получении статистики сессии:', error);
      throw error;
    }
  }
}

/**
 * Рассчитывает согласованность голосов
 */
function calculateConsistency(votes: number[]): { emoji: string; description: string } {
  if (votes.length === 0) {
    return { emoji: '❓', description: 'Нет голосов' };
  }

  if (votes.length === 1) {
    return { emoji: '🧍', description: 'Один голос' };
  }

  // Рассчитываем среднее и отклонение
  const sum = votes.reduce((acc: number, v: number) => acc + v, 0);
  const avg = sum / votes.length;

  // Среднее отклонение (в процентах от среднего)
  const deviations = votes.map((v: number) => Math.abs(v - avg) / avg);
  const avgDeviation =
    deviations.reduce((acc: number, v: number) => acc + v, 0) / deviations.length;

  // Уровни согласованности
  if (new Set(votes).size === 1) {
    return { emoji: '🔥', description: 'Полное согласие' };
  } else if (avgDeviation < 0.1) {
    return { emoji: '✨', description: 'Отличная согласованность' };
  } else if (avgDeviation < 0.2) {
    return { emoji: '👍', description: 'Хорошая согласованность' };
  } else if (avgDeviation < 0.4) {
    return { emoji: '🤔', description: 'Средняя согласованность' };
  } else if (avgDeviation < 0.6) {
    return { emoji: '😕', description: 'Низкая согласованность' };
  } else {
    return { emoji: '🌪️', description: 'Разброс мнений' };
  }
}
