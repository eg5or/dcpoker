import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для настроек уведомлений
export interface NotificationSettings {
  newSession: boolean;
  newVote: boolean;
  voteRevealed: boolean;
  emojiReceived: boolean;
  sessionCompleted: boolean;
}

// Интерфейс для типа голосования
export type VotingSequenceType = 'fibonacci' | 'linear' | 'tshirt';

// Интерфейс для настроек последовательности голосования
export interface VotingSequence {
  type: VotingSequenceType;
  values: number[]; // Значения для голосования
}

// Интерфейс для темы интерфейса
export type ThemeType = 'light' | 'dark' | 'system';

// Интерфейс для документа пользовательских настроек
export interface UserSettingsDocument extends Document {
  userId: mongoose.Types.ObjectId;
  favoriteEmojis: string[];
  theme: ThemeType;
  language: string;
  notifications: NotificationSettings;
  votingSequence: VotingSequence;
  createdAt: Date;
  updatedAt: Date;
}

// Схема для настроек уведомлений
const NotificationSettingsSchema = new Schema<NotificationSettings>(
  {
    newSession: { type: Boolean, default: true },
    newVote: { type: Boolean, default: true },
    voteRevealed: { type: Boolean, default: true },
    emojiReceived: { type: Boolean, default: true },
    sessionCompleted: { type: Boolean, default: true },
  },
  { _id: false }
);

// Схема для настроек последовательности голосования
const VotingSequenceSchema = new Schema<VotingSequence>(
  {
    type: {
      type: String,
      enum: ['fibonacci', 'linear', 'tshirt'],
      default: 'fibonacci',
    },
    values: {
      type: [Number],
      default: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
    },
  },
  { _id: false }
);

// Схема для пользовательских настроек
const UserSettingsSchema = new Schema<UserSettingsDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  favoriteEmojis: {
    type: [String],
    default: ['👍', '👎', '🔥', '🤔', '😊', '❤️'],
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system',
  },
  language: {
    type: String,
    default: 'ru',
  },
  notifications: {
    type: NotificationSettingsSchema,
    default: () => ({}),
  },
  votingSequence: {
    type: VotingSequenceSchema,
    default: () => ({}),
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Индексы для оптимизации запросов
UserSettingsSchema.index({ userId: 1 });

// Хук для обновления времени изменения
UserSettingsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Создание модели
export const UserSettings = mongoose.model<UserSettingsDocument>(
  'UserSettings',
  UserSettingsSchema
);
