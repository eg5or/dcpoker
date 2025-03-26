import bcrypt from 'bcrypt';
import mongoose, { Document, Schema } from 'mongoose';

// Интерфейс для документа пользователя
export interface UserDocument extends Document {
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Схема для пользователя
const UserSchema = new Schema<UserDocument>({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Пожалуйста, введите корректный email']
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
UserSchema.index({ email: 1 });
UserSchema.index({ lastActivityAt: -1 });

// Создание модели
export const User = mongoose.model<UserDocument>('User', UserSchema); 