import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import sessionRoutes from './routes/session.routes';
import settingsRoutes from './routes/settings.routes';
import statsRoutes from './routes/stats.routes';

// Загружаем переменные окружения
dotenv.config();

// Инициализируем Express приложение
const app = express();

// Настраиваем промежуточное ПО
app.use(cors());
app.use(express.json());

// Настраиваем маршруты
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sessions', sessionRoutes);

// Подключаемся к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dcpoker';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Подключено к MongoDB');
  })
  .catch((error) => {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1);
  });

// Обработчик ошибок для неверных маршрутов
app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

// Обработчик ошибок для ошибок сервера
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Запускаем сервер
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 