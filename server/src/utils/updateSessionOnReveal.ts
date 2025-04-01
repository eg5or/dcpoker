import mongoose from "mongoose";
import { Server } from "socket.io";
import { AuthenticatedSocket, GameState } from "../index.js";
import { StatsService } from "../services/stats.service.js";
import { VotingSessionDocument } from "./createOrUpdateVotingSession.js";

// Функция для завершения текущей сессии
export // Обновляет текущую сессию при раскрытии карт
async function updateSessionOnReveal(
  currentSession: VotingSessionDocument | null,
  gameState: GameState,
  io: Server
): Promise<void> {
  if (!currentSession) {
    console.error('Нет текущей сессии для обновления при раскрытии карт');
    return;
  }

  try {
    const votes = [];

    // Собираем актуальные голоса для сессии
    for (const user of gameState.users) {
      if (user.vote !== null) {
        let userId: string | mongoose.Types.ObjectId = user.id;

        // Если пользователь аутентифицирован, используем его MongoDB ID
        const socket = Array.from(io.sockets.sockets.values()).find(
          (s) => (s as any).id === user.id
        ) as AuthenticatedSocket | undefined;

        if (socket?.user?.id) {
          userId = new mongoose.Types.ObjectId(socket.user.id);
        }

        votes.push({
          userId,
          username: user.name,
          initialVote: user.vote,
          finalVote: user.vote,
          changedAfterReveal: false,
          votedAt: new Date(),
        });
      }
    }

    // Обновляем поля сессии
    currentSession.set({
      wasRevealed: true,
      votes,
      averageVote: gameState.averageVote,
      consistency: gameState.consistency,
      revealedAt: new Date(),
    });

    await currentSession.save();
    console.log('Сессия обновлена при раскрытии карт:', currentSession._id);

    // Обновляем статистику сессии для увеличения общего количества голосований
    await StatsService.updateSessionStats(currentSession._id.toString());

    // Обновляем глобальную статистику для гарантии актуальных данных
    await StatsService.recalculateGlobalChangedVotes();
  } catch (error) {
    console.error('Ошибка при обновлении сессии после раскрытия карт:', error);
  }
}