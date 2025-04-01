import { Server } from "socket.io";
import { AuthenticatedSocket, GameState } from "../index.js";

export async function emojisShake(
  userId: string,
  gameState: GameState,
  io: Server,
  socket: AuthenticatedSocket
) {
  // Проверяем, что пользователь пытается оттряхнуть свою карточку
  if (socket.id === userId) {
    // Проверяем, что пользователь находится в комнате
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    const shakeTime = Date.now();
    const user = gameState.users.find((u) => u.id === userId);
    if (user) {
      user.lastShakeTime = shakeTime;

      // Подсчитываем общее количество эмодзи на карточке
      const totalEmojis = Object.values(user.emojiAttacks || {}).reduce(
        (sum, count) => sum + count,
        0
      );

      if (totalEmojis > 0) {
        // Создаем массив всех возможных индексов
        const allIndices = Array.from({ length: totalEmojis }, (_, i) => i);

        // Перемешиваем индексы случайным образом
        const shuffledIndices = [...allIndices].sort(() => Math.random() - 0.5);

        // Определяем, какие эмодзи должны упасть (вероятность 70-95%)
        const fallingIndices = shuffledIndices.filter(() => {
          const baseChance = 0.7; // Базовый шанс падения 70%
          const randomBonus = Math.random() * 0.25; // Дополнительный бонус до 25%
          const totalChance = baseChance + randomBonus;
          return Math.random() < totalChance;
        });

        console.log(
          `Server decided ${fallingIndices.length} out of ${totalEmojis} emojis should fall for user ${user.name} in room ${socket.roomCode}`
        );

        // Отправляем только клиентам в текущей комнате индексы падающих эмодзи
        io.to(socket.roomCode).emit('emojis:shake', userId, shakeTime, fallingIndices);
      } else {
        // Если эмодзи нет, просто отправляем основное событие
        io.to(socket.roomCode).emit('emojis:shake', userId, shakeTime, []);
      }

      // Отправляем обновленное состояние только в текущую комнату
      io.to(socket.roomCode).emit('game:state', gameState);
    }
  }
}