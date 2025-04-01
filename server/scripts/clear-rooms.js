#!/usr/bin/env node

/**
 * Скрипт для очистки всех комнат в базе данных
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Загружаем переменные окружения
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Получаем MongoDB URI из переменных окружения
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scrum_poker';

console.log('Подключаемся к MongoDB по адресу:', MONGODB_URI);

// Подключаемся к базе данных
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Подключено к MongoDB');
    
    // Очищаем коллекцию комнат
    return mongoose.connection.db.collection('rooms').deleteMany({});
  })
  .then(result => {
    console.log(`Удалено ${result.deletedCount} комнат`);
    return mongoose.disconnect();
  })
  .then(() => {
    console.log('Соединение с MongoDB закрыто');
    process.exit(0);
  })
  .catch(err => {
    console.error('Ошибка:', err);
    process.exit(1);
  }); 