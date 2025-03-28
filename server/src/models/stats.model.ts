import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для эмодзи статистики
interface EmojiStat {
  emoji: string;
  count: number;
}

// Интерфейс для статистики по оценкам
interface VoteStat {
  value: number;
  count: number;
}

// Интерфейс для документа статистики пользователя
export interface UserStatsDocument extends Document {
  userId: mongoose.Types.ObjectId;
  totalSessions: number;
  completedSessions: number;
  votesStats: {
    total: number;
    values: VoteStat[];
    changedAfterReveal: number;
  };
  emojisStats: {
    sent: EmojiStat[];
    received: EmojiStat[];
  };
  lastUpdated: Date;
}

// Интерфейс для документа глобальной статистики
export interface GlobalStatsDocument extends Document {
  totalSessions: number;
  completedSessions: number;
  totalUsers: number;
  activeUsers: number;
  votesStats: {
    total: number;
    values: VoteStat[];
    averagePerSession: number;
    changedAfterReveal: number;
  };
  emojisStats: {
    total: number;
    topEmojis: EmojiStat[];
  };
  processedSessionIds: string[]; // Список ID обработанных сессий для предотвращения дублирования
  lastUpdated: Date;
}

// Схема для эмодзи статистики
const EmojiStatSchema = new Schema<EmojiStat>({
  emoji: { type: String, required: true },
  count: { type: Number, default: 0 }
}, { _id: false });

// Схема для статистики по оценкам
const VoteStatSchema = new Schema<VoteStat>({
  value: { type: Number, required: true },
  count: { type: Number, default: 0 }
}, { _id: false });

// Схема для статистики пользователя
const UserStatsSchema = new Schema<UserStatsDocument>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
  totalSessions: { type: Number, default: 0 },
  completedSessions: { type: Number, default: 0 },
  votesStats: {
    total: { type: Number, default: 0 },
    values: [VoteStatSchema],
    changedAfterReveal: { type: Number, default: 0 }
  },
  emojisStats: {
    sent: [EmojiStatSchema],
    received: [EmojiStatSchema]
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Схема для глобальной статистики
const GlobalStatsSchema = new Schema<GlobalStatsDocument>({
  totalSessions: { type: Number, default: 0 },
  completedSessions: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  votesStats: {
    total: { type: Number, default: 0 },
    values: [VoteStatSchema],
    averagePerSession: { type: Number, default: 0 },
    changedAfterReveal: { type: Number, default: 0 }
  },
  emojisStats: {
    total: { type: Number, default: 0 },
    topEmojis: [EmojiStatSchema]
  },
  processedSessionIds: { type: [String], default: [] }, // Список ID обработанных сессий
  lastUpdated: { type: Date, default: Date.now }
});

// Индексы для оптимизации запросов
UserStatsSchema.index({ userId: 1 });
UserStatsSchema.index({ lastUpdated: -1 });

// Создание моделей
export const UserStats = mongoose.model<UserStatsDocument>('UserStats', UserStatsSchema);
export const GlobalStats = mongoose.model<GlobalStatsDocument>('GlobalStats', GlobalStatsSchema); 