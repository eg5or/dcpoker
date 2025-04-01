import { GameState } from "../index.js";
import { StatsService } from "../services/stats.service.js";
import { VotingSessionDocument } from "./createOrUpdateVotingSession.js";

// Функция для завершения текущей сессии
export async function completeCurrentSession(
  currentSession: VotingSessionDocument | null,
  gameState: GameState
) {
  try {
    if (!currentSession) return;

    // Обновляем статус сессии на "завершено"
    currentSession.set({
      status: 'completed',
      completedAt: new Date(),
    });

    // Обновляем голоса, если они изменились после раскрытия
    if (gameState.usersChangedVoteAfterReveal.length > 0) {
      const votes = currentSession.get('votes') || [];

      for (const user of gameState.users) {
        if (user.changedVoteAfterReveal && user.vote !== null) {
          // Безопасный поиск индекса - проверяем существование userId и метода toString()
          const voteIndex = votes.findIndex((v: any) => {
            if (!v || !v.userId) return false;

            // Проверяем, что можно безопасно вызвать toString() или сравнить напрямую
            if (typeof v.userId === 'string') {
              return v.userId === user.id;
            } else if (v.userId.toString) {
              return v.userId.toString() === user.id;
            }
            return false;
          });

          if (voteIndex !== -1) {
            votes[voteIndex].finalVote = user.vote;
            votes[voteIndex].changedAfterReveal = true;
          }
        }
      }

      currentSession.set({ votes });
    }

    await currentSession.save();

    // При завершении сессии обновляем статус завершенных сессий
    console.log(`Обновление статуса завершения для сессии ${currentSession._id}`);
    await StatsService.updateCompletedSessionStats(currentSession._id.toString());

    // Сбрасываем текущую сессию
    currentSession = null;

    console.log('Завершена сессия голосования');
  } catch (error) {
    console.error('Ошибка при завершении сессии голосования:', error);
  }
}
