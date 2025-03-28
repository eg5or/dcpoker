import mongoose from 'mongoose';
import { VotingSession } from '../models/session.model';
import { GlobalStats, UserStats } from '../models/stats.model';
import { User } from '../models/user.model';
import ioModule from '../utils/io';

export class StatsService {
  /**
   * Получить статистику пользователя
   */
  static async getUserStats(userId: string): Promise<any> {
    try {
      // Проверяем, является ли userId валидным ObjectId или строкой
      let userObjectId;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjectId = new mongoose.Types.ObjectId(userId);
      } else {
        // Для строковых userId (id сокета), используем строковое значение как есть
        userObjectId = userId;
      }
      
      // Проверяем, есть ли статистика для пользователя
      let stats = await UserStats.findOne({ userId: userObjectId });
      
      // Если статистики нет, создаем запись с начальными значениями
      if (!stats) {
        stats = await UserStats.create({
          userId: userObjectId,
          totalSessions: 0,
          completedSessions: 0,
          votesStats: {
            total: 0,
            values: [],
            changedAfterReveal: 0
          },
          emojisStats: {
            sent: [],
            received: []
          },
          lastUpdated: new Date()
        });
      }
      
      return stats;
    } catch (error) {
      console.error('Ошибка при получении статистики пользователя:', error);
      throw error;
    }
  }
  
  /**
   * Получить общую статистику
   */
  static async getGlobalStats(): Promise<any> {
    try {
      // Проверяем, есть ли глобальная статистика
      let stats = await GlobalStats.findOne();
      
      // Если статистики нет, создаем запись с начальными значениями
      if (!stats) {
        // Получаем общее количество сессий и пользователей
        const totalSessions = await VotingSession.countDocuments();
        const completedSessions = await VotingSession.countDocuments({ status: 'completed' });
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ lastActivityAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        
        stats = await GlobalStats.create({
          totalSessions,
          completedSessions,
          totalUsers,
          activeUsers,
          votesStats: {
            total: 0,
            values: [],
            averagePerSession: 0,
            changedAfterReveal: 0
          },
          emojisStats: {
            total: 0,
            topEmojis: []
          },
          lastUpdated: new Date()
        });
      }
      
      return stats;
    } catch (error) {
      console.error('Ошибка при получении глобальной статистики:', error);
      throw error;
    }
  }
  
  /**
   * Обновить статистику эмодзи
   */
  static async updateEmojiStats(senderId: string, targetId: string, emoji: string): Promise<void> {
    try {
      let senderObjectId;
      let targetObjectId;
      
      // Проверяем, что ID имеют правильный формат для ObjectId
      try {
        // Проверяем формат senderId
        if (senderId && senderId.match(/^[0-9a-fA-F]{24}$/)) {
          senderObjectId = new mongoose.Types.ObjectId(senderId);
        } else {
          console.log(`Неверный формат senderId: ${senderId}, пропускаем обновление статистики`);
          return;
        }
        
        // Проверяем формат targetId
        if (targetId && targetId.match(/^[0-9a-fA-F]{24}$/)) {
          targetObjectId = new mongoose.Types.ObjectId(targetId);
        } else {
          console.log(`Неверный формат targetId: ${targetId}, пропускаем обновление статистики`);
          return;
        }
      } catch (error) {
        console.error('Ошибка при создании ObjectId:', error);
        return; // Прекращаем выполнение функции
      }
      
      // Обновляем статистику отправителя
      let senderStats = await UserStats.findOne({ userId: senderObjectId });
      if (!senderStats) {
        senderStats = await this.getUserStats(senderId);
      }
      
      // Проверяем, что senderStats не null
      if (senderStats) {
        // Обновляем информацию об отправленных эмодзи
        const sentEmojiIndex = senderStats.emojisStats.sent.findIndex(e => e.emoji === emoji);
        if (sentEmojiIndex !== -1) {
          senderStats.emojisStats.sent[sentEmojiIndex].count += 1;
        } else {
          senderStats.emojisStats.sent.push({ emoji, count: 1 });
        }
        
        senderStats.lastUpdated = new Date();
        await senderStats.save();
      } else {
        console.log(`Не удалось получить статистику для отправителя: ${senderId}`);
      }
      
      // Если targetId отличается от senderId, обновляем статистику получателя
      if (targetId !== senderId) {
        // Обновляем статистику получателя
        let targetStats = await UserStats.findOne({ userId: targetObjectId });
        if (!targetStats) {
          targetStats = await this.getUserStats(targetId);
        }
        
        // Проверяем, что targetStats не null
        if (targetStats) {
          // Обновляем информацию о полученных эмодзи
          const receivedEmojiIndex = targetStats.emojisStats.received.findIndex(e => e.emoji === emoji);
          if (receivedEmojiIndex !== -1) {
            targetStats.emojisStats.received[receivedEmojiIndex].count += 1;
          } else {
            targetStats.emojisStats.received.push({ emoji, count: 1 });
          }
          
          targetStats.lastUpdated = new Date();
          await targetStats.save();
        } else {
          console.log(`Не удалось получить статистику для получателя: ${targetId}`);
        }
      }
      
      // Обновляем глобальную статистику эмодзи
      await this.updateGlobalEmojiStats(emoji);
    } catch (error) {
      console.error('Ошибка при обновлении статистики эмодзи:', error);
      throw error;
    }
  }
  
  /**
   * Обновить глобальную статистику эмодзи
   */
  private static async updateGlobalEmojiStats(emoji: string): Promise<void> {
    try {
      let globalStats = await GlobalStats.findOne();
      if (!globalStats) {
        globalStats = await this.getGlobalStats();
      }
      
      // Проверяем, что globalStats не null перед обновлением
      if (globalStats) {
        // Увеличиваем общее количество эмодзи
        globalStats.emojisStats.total += 1;
        
        // Обновляем топ эмодзи
        const emojiIndex = globalStats.emojisStats.topEmojis.findIndex(e => e.emoji === emoji);
        if (emojiIndex !== -1) {
          globalStats.emojisStats.topEmojis[emojiIndex].count += 1;
          
          // Сортируем по количеству
          globalStats.emojisStats.topEmojis.sort((a, b) => b.count - a.count);
        } else {
          globalStats.emojisStats.topEmojis.push({ emoji, count: 1 });
          
          // Если в топе больше 10 эмодзи, удаляем самый редкий
          if (globalStats.emojisStats.topEmojis.length > 10) {
            globalStats.emojisStats.topEmojis.sort((a, b) => b.count - a.count);
            globalStats.emojisStats.topEmojis = globalStats.emojisStats.topEmojis.slice(0, 10);
          }
        }
        
        globalStats.lastUpdated = new Date();
        await globalStats.save();
      } else {
        console.error('Не удалось получить или создать глобальную статистику');
      }
    } catch (error) {
      console.error('Ошибка при обновлении глобальной статистики эмодзи:', error);
      throw error;
    }
  }
  
  /**
   * Обновить статистику сессии
   */
  static async updateSessionStats(sessionId: string): Promise<void> {
    try {
      const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
      
      // Получаем сессию
      const session = await VotingSession.findById(sessionObjectId);
      if (!session) {
        throw new Error('Сессия не найдена');
      }
      
      // Обрабатываем только раскрытые сессии
      if (!session.wasRevealed) {
        return;
      }
      
      // Проверяем, не обрабатывалась ли эта сессия ранее
      const isSessionAlreadyProcessed = session.get('statisticsProcessed');
      if (isSessionAlreadyProcessed) {
        console.log(`Сессия ${sessionId} уже учтена в статистике, пропускаем`);
        return;
      }
      
      // Получаем и логируем информацию об изменении голосов после раскрытия
      const votesWithChanges = session.votes.filter((vote: any) => vote.changedAfterReveal);
      console.log(`Сессия ${sessionId} содержит ${votesWithChanges.length} измененных голосов после раскрытия`);
      
      // Обновляем статистику каждого участника
      const processedUsers = new Set<string>();
      
      for (const vote of session.votes) {
        // Получаем userId в виде строки для использования в качестве ключа в processedUsers
        const userIdStr = typeof vote.userId === 'string' 
          ? vote.userId 
          : vote.userId.toString();
        
        // Пропускаем пользователей, которых уже обработали
        if (processedUsers.has(userIdStr)) {
          continue;
        }
        
        processedUsers.add(userIdStr);
        
        try {
          // Получаем статистику пользователя
          let userStats = await UserStats.findOne({ userId: vote.userId });
          if (!userStats) {
            // Если не найдено, создаем новую запись
            userStats = await this.getUserStats(userIdStr);
          }
          
          if (!userStats) {
            console.log(`Не удалось получить статистику для пользователя ${userIdStr}`);
            continue;
          }
          
          // Одна сессия = одно голосование, инкрементируем только один раз для пользователя
          // независимо от количества голосов
          userStats.totalSessions += 1;
          
          // Если сессия была завершена, увеличиваем счетчик завершенных сессий
          if (session.status === 'completed') {
            userStats.completedSessions += 1;
          }
          
          // Увеличиваем количество голосов пользователя
          userStats.votesStats.total += 1;
          
          // Если голос был изменен после раскрытия, обновляем статистику
          if (vote.changedAfterReveal) {
            console.log(`Пользователь ${userIdStr} изменил голос после раскрытия: ${vote.initialVote} -> ${vote.finalVote}`);
            userStats.votesStats.changedAfterReveal += 1;
          }
          
          // Обновляем статистику по оценкам
          const initialVote = vote.initialVote;
          if (initialVote !== null && typeof initialVote === 'number') {
            const voteIndex = userStats.votesStats.values.findIndex(v => v.value === initialVote);
            if (voteIndex !== -1) {
              userStats.votesStats.values[voteIndex].count += 1;
            } else {
              userStats.votesStats.values.push({ value: initialVote, count: 1 });
            }
          }
          
          userStats.lastUpdated = new Date();
          await userStats.save();
        } catch (error) {
          console.error(`Ошибка при обновлении статистики пользователя ${userIdStr}:`, error);
          // Продолжаем с другими пользователями, не прерывая процесс
        }
      }
      
      // Обновляем глобальную статистику
      await this.updateGlobalSessionStats(session);
      
      // Помечаем сессию как обработанную в статистике
      session.set('statisticsProcessed', true);
      await session.save();
      
      console.log(`Статистика для сессии ${sessionId} успешно обновлена`);
    } catch (error) {
      console.error('Ошибка при обновлении статистики сессии:', error);
      throw error;
    }
  }
  
  /**
   * Обновить статистику завершенной сессии
   * Этот метод обновляет только счетчики завершенных сессий,
   * предполагая, что основная статистика уже была обновлена в updateSessionStats
   */
  static async updateCompletedSessionStats(sessionId: string): Promise<void> {
    try {
      const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
      
      // Получаем сессию
      const session = await VotingSession.findById(sessionObjectId);
      if (!session) {
        throw new Error('Сессия не найдена');
      }
      
      // Проверяем, что сессия действительно завершена
      if (session.status !== 'completed') {
        console.log(`Сессия ${sessionId} не имеет статуса 'completed', пропускаем обновление`);
        return;
      }
      
      // Обновляем счетчики завершенных сессий для каждого участника
      const processedUsers = new Set<string>();
      
      for (const vote of session.votes) {
        const userId = vote.userId.toString();
        
        // Пропускаем пользователей, которых уже обработали
        if (processedUsers.has(userId)) {
          continue;
        }
        
        processedUsers.add(userId);
        
        // Получаем статистику пользователя
        let userStats = await UserStats.findOne({ userId: vote.userId });
        if (!userStats) {
          continue; // Пропускаем, если статистика не найдена
        }
        
        // Увеличиваем счетчик завершенных сессий
        userStats.completedSessions += 1;
        userStats.lastUpdated = new Date();
        await userStats.save();
      }
      
      // Обновляем глобальную статистику
      let globalStats = await GlobalStats.findOne();
      if (globalStats) {
        // Увеличиваем счетчик завершенных сессий
        globalStats.completedSessions += 1;
        globalStats.lastUpdated = new Date();
        await globalStats.save();
        
        console.log(`Обновлена статистика завершенных сессий для ${sessionId}. Всего завершено: ${globalStats.completedSessions}`);
        
        // Оповещаем клиентов об обновлении статистики
        try {
          const io = ioModule.getIO();
          io.emit('stats:updated');
          console.log('Отправлено событие stats:updated при завершении сессии');
        } catch (error) {
          console.error('Ошибка при отправке события stats:updated:', error);
        }
      }
      
    } catch (error) {
      console.error('Ошибка при обновлении статистики завершенной сессии:', error);
      throw error;
    }
  }
  
  /**
   * Обновить глобальную статистику на основе сессии
   */
  private static async updateGlobalSessionStats(session: any): Promise<void> {
    try {
      let globalStats = await GlobalStats.findOne();
      if (!globalStats) {
        globalStats = await this.getGlobalStats();
      }
      
      if (!globalStats) {
        console.error('Не удалось получить глобальную статистику');
        return;
      }
      
      // Проверяем, не обрабатывалась ли эта сессия ранее для глобальной статистики
      // Это критически важная проверка для предотвращения дублирования сессий
      const processedSessionIds = globalStats.get('processedSessionIds') || [];
      const sessionId = session._id.toString();
      
      if (processedSessionIds.includes(sessionId)) {
        console.log(`Сессия ${sessionId} уже учтена в глобальной статистике, пропускаем`);
        return;
      }
      
      // ВАЖНО: Для каждой сессии увеличиваем счетчик сессий ровно на 1,
      // независимо от количества участников
      console.log(`Инкрементируем счетчик сессий. Текущее значение: ${globalStats.totalSessions}`);
      globalStats.totalSessions += 1;
      
      // Если сессия была завершена, увеличиваем счетчик завершенных сессий
      if (session.status === 'completed') {
        globalStats.completedSessions += 1;
      }
      
      // Собираем статистику по оценкам
      const validVotes = session.votes.filter((vote: any) => vote.initialVote !== null && typeof vote.initialVote === 'number');
      const changedVotes = session.votes.filter((vote: any) => vote.changedAfterReveal);
      
      // Обновляем общую статистику по голосам - каждый голос отдельно учитываем
      globalStats.votesStats.total += validVotes.length;
      globalStats.votesStats.changedAfterReveal += changedVotes.length;
      
      // Обновляем среднее количество голосов на сессию
      globalStats.votesStats.averagePerSession = parseFloat(
        (globalStats.votesStats.total / globalStats.totalSessions).toFixed(2)
      );
      
      // Обновляем статистику по оценкам
      for (const vote of validVotes as Array<{ initialVote: number }>) {
        const voteValue = vote.initialVote;
        const voteIndex = globalStats.votesStats.values.findIndex((v: { value: number }) => v.value === voteValue);
        
        if (voteIndex !== -1) {
          globalStats.votesStats.values[voteIndex].count += 1;
        } else {
          globalStats.votesStats.values.push({ value: voteValue, count: 1 });
        }
      }
      
      // Обновляем количество пользователей
      globalStats.totalUsers = await User.countDocuments();
      globalStats.activeUsers = await User.countDocuments({ 
        lastActivityAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
      });
      
      // Сортируем оценки по значению
      globalStats.votesStats.values.sort((a, b) => a.value - b.value);
      
      // Добавляем идентификатор обработанной сессии
      processedSessionIds.push(sessionId);
      globalStats.set('processedSessionIds', processedSessionIds);
      
      globalStats.lastUpdated = new Date();
      await globalStats.save();
      
      console.log(`Глобальная статистика обновлена для сессии ${sessionId}. Всего сессий: ${globalStats.totalSessions}`);
      
      try {
        // Оповещаем клиентов об обновлении статистики
        const io = ioModule.getIO();
        io.emit('stats:updated');
        console.log('Отправлено событие stats:updated');
      } catch (error) {
        console.error('Ошибка при отправке события stats:updated:', error);
      }
      
    } catch (error) {
      console.error('Ошибка при обновлении глобальной статистики сессии:', error);
      throw error;
    }
  }
  
  /**
   * Обновить статистику при изменении голосов после раскрытия карт
   * Этот метод используется когда пользователи меняют свои голоса после раскрытия карт,
   * и нужно обновить уже записанную статистику
   */
  static async updateVoteChangesStats(sessionId: string): Promise<void> {
    try {
      const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
      
      // Получаем сессию
      const session = await VotingSession.findById(sessionObjectId);
      if (!session) {
        throw new Error('Сессия не найдена');
      }
      
      // Проверяем, что сессия была раскрыта
      if (!session.wasRevealed) {
        console.log(`Сессия ${sessionId} не была раскрыта, нет смысла обновлять голоса`);
        return;
      }
      
      // Получаем изменённые голоса
      const changedVotes = session.votes.filter((vote: any) => vote.changedAfterReveal);
      console.log(`Обновление статистики для ${changedVotes.length} измененных голосов в сессии ${sessionId}`);
      
      // Если изменённых голосов нет, нет смысла продолжать
      if (changedVotes.length === 0) {
        return;
      }
      
      // Обновляем статистику по измененным голосам для каждого пользователя
      const processedUsers = new Set<string>();
      
      for (const vote of changedVotes) {
        // Получаем userId в виде строки для использования в качестве ключа в processedUsers
        const userIdStr = typeof vote.userId === 'string' 
          ? vote.userId 
          : vote.userId.toString();
        
        // Пропускаем пользователей, которых уже обработали
        if (processedUsers.has(userIdStr)) {
          continue;
        }
        
        processedUsers.add(userIdStr);
        
        try {
          // Получаем статистику пользователя
          let userStats = await UserStats.findOne({ userId: vote.userId });
          if (!userStats) {
            // Если не найдено, пробуем найти или создать запись
            userStats = await this.getUserStats(userIdStr);
          }
          
          if (!userStats) {
            console.log(`Не удалось найти статистику для пользователя ${userIdStr}`);
            continue;
          }
          
          // Обновляем счетчик изменений голоса после раскрытия, 
          // если он не был обновлен ранее
          if (!vote.changedAfterRevealCounted) {
            console.log(`Увеличиваем счетчик изменений для пользователя ${userIdStr}: ${userStats.votesStats.changedAfterReveal} -> ${userStats.votesStats.changedAfterReveal + 1}`);
            userStats.votesStats.changedAfterReveal += 1;
            
            // Отмечаем, что изменение было учтено
            vote.changedAfterRevealCounted = true;
          }
          
          userStats.lastUpdated = new Date();
          await userStats.save();
        } catch (error) {
          console.error(`Ошибка при обновлении статистики изменённых голосов для пользователя ${userIdStr}:`, error);
          // Продолжаем с другими пользователями, не прерывая процесс
        }
      }
      
      // Сохраняем состояние сессии
      await session.save();
      
      // Обновляем глобальную статистику по измененным голосам
      let globalStats = await GlobalStats.findOne();
      
      if (globalStats) {
        // Подсчитываем новые изменённые голоса, которые еще не были учтены
        const uncountedChanges = changedVotes.filter((vote: any) => !vote.changedAfterRevealCounted).length;
        
        if (uncountedChanges > 0) {
          console.log(`Обновляем глобальную статистику изменений голосов: ${globalStats.votesStats.changedAfterReveal} -> ${globalStats.votesStats.changedAfterReveal + uncountedChanges}`);
          globalStats.votesStats.changedAfterReveal += uncountedChanges;
          globalStats.lastUpdated = new Date();
          await globalStats.save();
          
          // Оповещаем клиентов об обновлении статистики
          try {
            const io = ioModule.getIO();
            io.emit('stats:updated');
            console.log('Отправлено событие stats:updated после обновления изменённых голосов');
          } catch (error) {
            console.error('Ошибка при отправке события stats:updated:', error);
          }
        }
      }
      
      console.log(`Статистика изменённых голосов для сессии ${sessionId} успешно обновлена`);
    } catch (error) {
      console.error('Ошибка при обновлении статистики изменённых голосов:', error);
      throw error;
    }
  }
}