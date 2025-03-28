import mongoose, { Document, Schema, model } from 'mongoose';

// Интерфейс для статистики голосования
export interface VoteStat {
  value: number;
  count: number;
}

// Схема для статистики голосования
export const VoteStatSchema = new Schema<VoteStat>({
  value: Number,
  count: Number
}, { _id: false });

// Интерфейс для статистики эмодзи
export interface EmojiStat {
  emoji: string;
  count: number;
}

// Схема для статистики эмодзи
export const EmojiStatSchema = new Schema<EmojiStat>({
  emoji: String,
  count: Number
}, { _id: false });

// Интерфейс для статистики пользователя
export interface UserStatsDocument extends Document {
  // ID пользователя, может быть ObjectId или строкой (для сокетов)
  userId: mongoose.Types.ObjectId | string;
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

// Схема для статистики пользователя
export const UserStatsSchema = new Schema<UserStatsDocument>({
  // Используем Schema.Types.Mixed, чтобы принимать как ObjectId, так и строки
  userId: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(v: any) {
        // Проверяем, что значение либо валидный ObjectId, либо непустая строка
        return mongoose.Types.ObjectId.isValid(v) || (typeof v === 'string' && v.trim().length > 0);
      },
      message: 'userId должен быть валидным ObjectId или непустой строкой'
    },
    index: true
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  completedSessions: {
    type: Number,
    default: 0
  },
  votesStats: {
    total: {
      type: Number,
      default: 0
    },
    values: [VoteStatSchema],
    changedAfterReveal: {
      type: Number,
      default: 0
    }
  },
  emojisStats: {
    sent: [EmojiStatSchema],
    received: [EmojiStatSchema]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Model для статистики пользователя
export const UserStats = model<UserStatsDocument>('UserStats', UserStatsSchema);

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

// Создание моделей
export const GlobalStats = mongoose.model<GlobalStatsDocument>('GlobalStats', GlobalStatsSchema);

// Индексы для оптимизации запросов
UserStatsSchema.index({ userId: 1 });
UserStatsSchema.index({ lastUpdated: -1 }); 