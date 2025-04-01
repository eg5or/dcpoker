import mongoose from 'mongoose';
import { ThemeType, UserSettings, VotingSequenceType } from '../models/settings.model.js';

// Интерфейс для данных настроек пользователя
interface UserSettingsData {
  favoriteEmojis?: string[];
  theme?: ThemeType;
  language?: string;
  notifications?: {
    newSession?: boolean;
    newVote?: boolean;
    voteRevealed?: boolean;
    emojiReceived?: boolean;
    sessionCompleted?: boolean;
  };
  votingSequence?: {
    type?: VotingSequenceType;
    values?: number[];
  };
}

export class SettingsService {
  /**
   * Получить настройки пользователя
   */
  static async getUserSettings(userId: string): Promise<any> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Проверяем, есть ли настройки для пользователя
      let settings = await UserSettings.findOne({ userId: userObjectId });

      // Если настроек нет, создаем запись с настройками по умолчанию
      if (!settings) {
        settings = await UserSettings.create({
          userId: userObjectId,
          favoriteEmojis: ['👍', '👎', '🔥', '🤔', '😊', '❤️'],
          theme: 'system',
          language: 'ru',
          notifications: {
            newSession: true,
            newVote: true,
            voteRevealed: true,
            emojiReceived: true,
            sessionCompleted: true,
          },
          votingSequence: {
            type: 'fibonacci',
            values: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return settings;
    } catch (error) {
      console.error('Ошибка при получении настроек пользователя:', error);
      throw error;
    }
  }

  /**
   * Обновить настройки пользователя
   */
  static async updateUserSettings(userId: string, settingsData: UserSettingsData): Promise<any> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Проверяем, есть ли настройки для пользователя
      let settings = await UserSettings.findOne({ userId: userObjectId });

      // Если настроек нет, создаем запись с настройками по умолчанию
      if (!settings) {
        settings = await this.getUserSettings(userId);
      }

      // Важно: на этом этапе settings не может быть null, так как getUserSettings
      // всегда возвращает объект (создает новый, если не нашел существующий)

      // Обновляем настройки
      if (settingsData.favoriteEmojis !== undefined && settings) {
        settings.favoriteEmojis = settingsData.favoriteEmojis;
      }

      if (settingsData.theme !== undefined && settings) {
        settings.theme = settingsData.theme;
      }

      if (settingsData.language !== undefined && settings) {
        settings.language = settingsData.language;
      }

      // Обновляем настройки уведомлений
      if (settingsData.notifications && settings) {
        // Инициализируем объект, если он не существует
        if (!settings.notifications) {
          settings.notifications = {
            newSession: true,
            newVote: true,
            voteRevealed: true,
            emojiReceived: true,
            sessionCompleted: true,
          };
        }

        // Обновляем отдельные настройки уведомлений
        if (settingsData.notifications.newSession !== undefined) {
          settings.notifications.newSession = settingsData.notifications.newSession;
        }

        if (settingsData.notifications.newVote !== undefined) {
          settings.notifications.newVote = settingsData.notifications.newVote;
        }

        if (settingsData.notifications.voteRevealed !== undefined) {
          settings.notifications.voteRevealed = settingsData.notifications.voteRevealed;
        }

        if (settingsData.notifications.emojiReceived !== undefined) {
          settings.notifications.emojiReceived = settingsData.notifications.emojiReceived;
        }

        if (settingsData.notifications.sessionCompleted !== undefined) {
          settings.notifications.sessionCompleted = settingsData.notifications.sessionCompleted;
        }
      }

      // Обновляем настройки последовательности голосования
      if (settingsData.votingSequence && settings) {
        // Инициализируем объект, если он не существует
        if (!settings.votingSequence) {
          settings.votingSequence = {
            type: 'fibonacci',
            values: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
          };
        }

        if (settingsData.votingSequence.type !== undefined) {
          settings.votingSequence.type = settingsData.votingSequence.type;
        }

        if (settingsData.votingSequence.values !== undefined) {
          settings.votingSequence.values = settingsData.votingSequence.values;
        }
      }

      if (settings) {
        settings.updatedAt = new Date();
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('Ошибка при обновлении настроек пользователя:', error);
      throw error;
    }
  }

  /**
   * Добавить эмодзи в избранное
   */
  static async addFavoriteEmoji(userId: string, emoji: string): Promise<any> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Проверяем, есть ли настройки для пользователя
      let settings = await UserSettings.findOne({ userId: userObjectId });

      // Если настроек нет, создаем запись с настройками по умолчанию
      if (!settings) {
        settings = await this.getUserSettings(userId);
      }

      // Проверяем, есть ли уже этот эмодзи в избранном
      if (settings && !settings.favoriteEmojis.includes(emoji)) {
        settings.favoriteEmojis.push(emoji);

        // Ограничиваем количество избранных эмодзи до 12
        if (settings.favoriteEmojis.length > 12) {
          settings.favoriteEmojis = settings.favoriteEmojis.slice(-12);
        }

        settings.updatedAt = new Date();
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('Ошибка при добавлении эмодзи в избранное:', error);
      throw error;
    }
  }

  /**
   * Удалить эмодзи из избранного
   */
  static async removeFavoriteEmoji(userId: string, emoji: string): Promise<any> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Проверяем, есть ли настройки для пользователя
      let settings = await UserSettings.findOne({ userId: userObjectId });

      // Если настроек нет, возвращаем пустой объект настроек
      if (!settings) {
        return await this.getUserSettings(userId);
      }

      // Удаляем эмодзи из избранного
      settings.favoriteEmojis = settings.favoriteEmojis.filter((e: string) => e !== emoji);
      settings.updatedAt = new Date();
      await settings.save();

      return settings;
    } catch (error) {
      console.error('Ошибка при удалении эмодзи из избранного:', error);
      throw error;
    }
  }
}
