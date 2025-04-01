import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для документа комнаты
export interface RoomInterface extends Document {
  name: string;
  code: string;
  emoji?: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  settings?: {
    votingSequence: number[];
    allowObservers: boolean;
    autoReveal: boolean;
  };
}

// Схема для комнаты
const roomSchema = new Schema<RoomInterface>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  emoji: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
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
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  settings: {
    votingSequence: {
      type: [Number],
      default: [0.1, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100],
    },
    allowObservers: {
      type: Boolean,
      default: true,
    },
    autoReveal: {
      type: Boolean,
      default: false,
    },
  },
});

// Индексы для оптимизации запросов
roomSchema.index({ name: 1 });
roomSchema.index({ createdBy: 1 });
roomSchema.index({ createdAt: -1 });
roomSchema.index({ lastActivity: -1 });
roomSchema.index({ isActive: 1 });

// Генерация уникального кода комнаты
roomSchema.pre('save', async function (next) {
  if (this.isNew && !this.code) {
    this.code = generateRoomCode();
    
    // Проверяем уникальность кода
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (codeExists && attempts < maxAttempts) {
      const existingRoom = await mongoose.model('Room').findOne({ code: this.code });
      if (!existingRoom) {
        codeExists = false;
      } else {
        this.code = generateRoomCode();
        attempts++;
      }
    }
    
    if (attempts >= maxAttempts) {
      return next(new Error('Не удалось создать уникальный код комнаты'));
    }
  }
  next();
});

// Функция для генерации кода комнаты из 6 символов
function generateRoomCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
}

// Создание модели
export const Room = mongoose.model<RoomInterface>('Room', roomSchema);

// Добавить экспорт дефолтной модели для совместимости
export default Room; 