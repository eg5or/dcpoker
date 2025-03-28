import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dcpoker';

// Экспортируем как именованный экспорт для совместимости с ESM
export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB подключено успешно');
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Экспортируем как дефолтный экспорт для обратной совместимости
export default connectDB; 