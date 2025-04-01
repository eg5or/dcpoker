import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для документа комнаты
export interface RoomDocument extends Document {
  name: string;
  emoji: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
}

// Схема для комнаты
const RoomSchema = new Schema<RoomDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  emoji: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10, // Для эмодзи
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActivityAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Индексы для оптимизации запросов
RoomSchema.index({ name: 1 });
RoomSchema.index({ createdBy: 1 });
RoomSchema.index({ createdAt: -1 });
RoomSchema.index({ lastActivityAt: -1 });
RoomSchema.index({ isActive: 1 });

// Создание модели
export const Room = mongoose.model<RoomDocument>('Room', RoomSchema);

// Добавить экспорт дефолтной модели для совместимости
export default Room; 