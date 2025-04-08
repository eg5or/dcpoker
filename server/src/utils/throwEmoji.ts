import mongoose from "mongoose";
import { Server } from "socket.io";
import { AuthenticatedSocket, GameState } from "../index.js";
import { StatsService } from "../services/stats.service.js";
import { VotingSessionDocument } from "./createOrUpdateVotingSession.js";
import { emojiBatcher } from "./emojiBatcher.js";
import { eventBroadcaster } from "./eventBroadcaster.js";

export async function throwEmoji(
  targetUserId: string,
  emoji: string,
  placement: { x: number; y: number; rotation: number },
  gameState: GameState,
  io: Server,
  socket: AuthenticatedSocket,
  currentSession: VotingSessionDocument | null  
) {
  console.log('Received throw:emoji event:', { targetUserId, emoji, placement });
  
  // Убедимся, что socket.roomCode определен
  if (!socket.roomCode) {
    console.error('Error: socket.roomCode is undefined');
    return;
  }
  
  const targetUser = gameState.users.find((u) => u.id === targetUserId);
  const fromUser = gameState.users.find((u) => u.id === socket.id);

  // Проверяем, что оба пользователя находятся в одной комнате
  const targetSocket = Array.from(io.sockets.sockets.values()).find(
    (s) => (s as any).id === targetUserId
  ) as AuthenticatedSocket | undefined;
  
  if (!targetSocket || targetSocket.roomCode !== socket.roomCode) {
    console.error('Target is not in the same room or not found');
    return;
  }

  if (targetUser && fromUser && targetUser.id !== fromUser.id) {
    console.log('Users found:', { targetUser: targetUser.name, fromUser: fromUser.name });

    // Инициализируем объект, если он не существует
    if (!targetUser.emojiAttacks) {
      targetUser.emojiAttacks = {};
    }

    // Увеличиваем счетчик для данного эмодзи
    targetUser.emojiAttacks[emoji] = (targetUser.emojiAttacks[emoji] || 0) + 1;

    // Генерируем случайную траекторию
    const side = Math.floor(Math.random() * 4);
    let startX, startY;

    switch (side) {
      case 0:
        startX = Math.random() * 100;
        startY = -10;
        break;
      case 1:
        startX = 110;
        startY = Math.random() * 100;
        break;
      case 2:
        startX = Math.random() * 100;
        startY = 110;
        break;
      case 3:
        startX = -10;
        startY = Math.random() * 100;
        break;
    }

    const trajectory = {
      startX,
      startY,
      angle: Math.random() * Math.PI * 2,
      speed: Math.random() * 20 + 40,
    };

    const throwTime = Date.now();

    // Используем оптимизированную рассылку событий
    eventBroadcaster.throttledBroadcast(
      io,
      socket.roomCode,
      'emoji:thrown',
      targetUser.id,
      fromUser.id,
      emoji,
      trajectory,
      throwTime,
      placement
    );

    // Записываем событие броска эмодзи в текущую сессию через батчер
    if (currentSession && socket.user && socket.user.id) {
      await emojiBatcher.addToBatch(
        currentSession,
        new mongoose.Types.ObjectId(socket.user.id),
        targetUser.id,
        fromUser.name,
        targetUser.name,
        emoji
      );

      // Обновляем статистику эмодзи для отправителя
      try {
        // Проверяем, аутентифицирован ли получатель
        const targetSocketUser = Array.from(io.sockets.sockets.values()).find(
          (s) => (s as any).id === targetUser.id && (s as any).user?.id
        ) as AuthenticatedSocket | undefined;

        // ID получателя: либо ID аутентифицированного пользователя, либо ID сокета
        const targetUserId = targetSocketUser?.user?.id || targetUser.id;

        // Обновляем статистику с правильными ID отправителя и получателя
        await StatsService.updateEmojiStats(socket.user.id, targetUserId, emoji);
      } catch (error) {
        console.error('Ошибка при обновлении статистики эмодзи:', error);
      }
    }

    // Используем оптимизированную рассылку для обновления состояния
    eventBroadcaster.throttledBroadcast(io, socket.roomCode, 'game:state', gameState);
  } else {
    console.log('Users not found or same user:', {
      targetFound: !!targetUser,
      fromFound: !!fromUser,
      isSameUser: targetUser?.id === fromUser?.id,
    });
  }
}