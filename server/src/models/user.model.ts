import bcrypt from 'bcrypt';
import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для документа пользователя
export interface UserDocument extends Document {
  username: string;
  login: string;
  password: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  name?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Схема для пользователя
const UserSchema = new Schema<UserDocument>({
  username: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  login: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastLoginAt: { 
    type: Date, 
    default: null 
  },
  lastActivityAt: { 
    type: Date, 
    default: Date.now 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Виртуальное свойство name для совместимости с существующим кодом
UserSchema.virtual('name').get(function(this: UserDocument) {
  return this.username;
});

// Метод для сравнения пароля с хешем
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Хук для хеширования пароля перед сохранением
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Индексы для оптимизации запросов
UserSchema.index({ username: 1 });
UserSchema.index({ login: 1 });
UserSchema.index({ lastActivityAt: -1 });

// Настройка для включения виртуальных полей в объекты JSON
UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function(_doc, ret) {
    delete ret.password;
    return ret;
  }
});

// Создание модели
export const User = mongoose.model<UserDocument>('User', UserSchema); 