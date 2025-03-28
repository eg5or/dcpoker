import express from 'express';
import { UserSettingsController } from '../controllers/user-settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Маршруты, требующие авторизации
router.use(authMiddleware);

// Маршрут для получения настроек текущего пользователя
router.get('/me', UserSettingsController.getUserSettings);

// Маршрут для обновления настроек текущего пользователя
router.put('/me', UserSettingsController.updateUserSettings);

// Маршрут для добавления эмодзи в избранное
router.post('/me/favorites/emoji', UserSettingsController.addFavoriteEmoji);

// Маршрут для удаления эмодзи из избранного
router.delete('/me/favorites/emoji/:emoji', UserSettingsController.removeFavoriteEmoji);

export default router; 