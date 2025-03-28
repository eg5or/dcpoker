import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения
dotenv.config();

// Подключаемся к базе данных
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dcpoker';
    await mongoose.connect(uri);
    console.log('MongoDB подключена');
  } catch (error) {
    console.error('Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Определяем схему пользователя для миграции
const UserSchema = new mongoose.Schema({
  username: String,
  login: String,
  email: String,
  // Другие поля не важны для миграции
});

const User = mongoose.model('User', UserSchema, 'users');

// Функция для удаления индекса email
const dropEmailIndex = async () => {
  try {
    await mongoose.connection.db.collection('users').dropIndex('email_1');
    console.log('Индекс email_1 удален успешно');
    return true;
  } catch (error) {
    console.error('Ошибка при удалении индекса email_1:', error);
    return false;
  }
};

// Функция для миграции данных из email в login
const migrateEmailToLogin = async () => {
  try {
    // Сначала удаляем индекс, чтобы не было проблем с уникальностью
    const indexDropped = await dropEmailIndex();
    if (!indexDropped) {
      console.log('Продолжаем без удаления индекса');
    }
    
    // Находим всех пользователей с email
    const users = await User.find({ email: { $exists: true, $ne: null } });
    
    console.log(`Найдено ${users.length} пользователей с email`);
    
    // Обновляем login для каждого пользователя
    let updated = 0;
    for (const user of users) {
      if (!user.login && user.email) {
        // Если login не установлен, копируем из email
        await User.updateOne(
          { _id: user._id },
          { $set: { login: user.email } }
        );
        updated++;
      }
    }
    
    console.log(`Обновлено ${updated} пользователей`);
    
    // Удаляем поле email у всех пользователей
    try {
      const removeResult = await User.updateMany(
        {},
        { $unset: { email: "" } }
      );
      
      console.log(`Удалено поле email у ${removeResult.modifiedCount} пользователей`);
    } catch (error) {
      console.error('Ошибка при удалении поля email:', error);
      
      // Пробуем альтернативный подход - удаление поля у каждого пользователя отдельно
      console.log('Пробуем удалить поле email для каждого пользователя отдельно...');
      const allUsers = await User.find({});
      let removed = 0;
      
      for (const user of allUsers) {
        try {
          if (user.email !== undefined) {
            await User.updateOne(
              { _id: user._id },
              { $unset: { email: "" } }
            );
            removed++;
          }
        } catch (userError) {
          console.error(`Ошибка при удалении поля email у пользователя ${user._id}:`, userError);
        }
      }
      
      console.log(`Удалено поле email у ${removed} пользователей (альтернативный метод)`);
    }
    
    console.log('Миграция успешно завершена');
  } catch (error) {
    console.error('Ошибка при миграции данных:', error);
  }
};

// Запускаем миграцию
const runMigration = async () => {
  await connectDB();
  await migrateEmailToLogin();
  process.exit(0);
};

runMigration(); 