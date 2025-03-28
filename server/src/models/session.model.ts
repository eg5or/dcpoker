import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для учёта голосов в сессии
export interface Vote {
  userId: mongoose.Types.ObjectId;
  username: string;
  initialVote: number;
  finalVote: number;
  votedAt: Date;
  changedAfterReveal: boolean;
}

// Интерфейс для эмодзи в сессии
export interface SessionEmoji {
  senderId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  senderName: string;
  targetName: string;
  emoji: string;
  thrownAt: Date;
}

// Интерфейс для статистики согласованности
export interface ConsistencyResult {
  emoji: string;
  description: string;
}

// Интерфейс для документа сессии голосования
export interface VotingSessionDocument extends Document {
  createdBy: mongoose.Types.ObjectId;
  title: string;
  status: 'active' | 'revealed' | 'completed';
  participants: mongoose.Types.ObjectId[];
  votes: Vote[];
  emojis: SessionEmoji[];
  wasRevealed: boolean;
  averageVote?: number;
  consistency?: ConsistencyResult;
  createdAt: Date;
  revealedAt?: Date;
  completedAt?: Date;
}

// Схема для голоса в сессии
const VoteSchema = new Schema<Vote>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  username: { type: String, required: true },
  initialVote: { type: Number, required: true },
  finalVote: { type: Number, required: true },
  votedAt: { type: Date, default: Date.now },
  changedAfterReveal: { type: Boolean, default: false }
});

// Схема для эмодзи в сессии
const SessionEmojiSchema = new Schema<SessionEmoji>({
  senderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  targetId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  senderName: { type: String, required: true },
  targetName: { type: String, required: true },
  emoji: { type: String, required: true },
  thrownAt: { type: Date, default: Date.now }
});

// Схема для статистики согласованности
const ConsistencySchema = new Schema<ConsistencyResult>({
  emoji: { type: String, required: true },
  description: { type: String, required: true }
});

// Схема для сессии голосования
const VotingSessionSchema = new Schema<VotingSessionDocument>({
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  title: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'revealed', 'completed'],
    default: 'active'
  },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  votes: [VoteSchema],
  emojis: [SessionEmojiSchema],
  wasRevealed: { type: Boolean, default: false },
  averageVote: { type: Number },
  consistency: { type: ConsistencySchema },
  createdAt: { type: Date, default: Date.now },
  revealedAt: { type: Date },
  completedAt: { type: Date }
});

// Индексы для оптимизации запросов
VotingSessionSchema.index({ status: 1 });
VotingSessionSchema.index({ participants: 1 });
VotingSessionSchema.index({ createdAt: -1 });
VotingSessionSchema.index({ createdBy: 1, createdAt: -1 });

// Создание модели
export const VotingSession = mongoose.model<VotingSessionDocument>('VotingSession', VotingSessionSchema); 