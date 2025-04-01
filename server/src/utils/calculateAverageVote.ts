import { GameState } from "../index.js";

export function calculateAverageVote(gameState: GameState) {
  const votes = gameState.users
    .filter((u) => u.vote !== null && u.isOnline)
    .map((u) => u.vote as number);

  if (votes.length === 0) {
    gameState.averageVote = null;
    gameState.consistency = null;
    return;
  }

  // Считаем среднее с точностью до десятых
  const average = votes.reduce((a, b) => a + b, 0) / votes.length;
  gameState.averageVote = Math.round(average * 10) / 10;

  // Считаем стандартное отклонение
  const variance = votes.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / votes.length;
  const stdDev = Math.sqrt(variance);

  // Коэффициент вариации (CV) - отношение стандартного отклонения к среднему
  const cv = (stdDev / average) * 100;

  // Определяем согласованность на основе коэффициента вариации
  if (cv === 0) {
    gameState.consistency = {
      emoji: '🤩',
      description: 'Полное единогласие!',
    };
  } else if (cv <= 15) {
    gameState.consistency = {
      emoji: '😊',
      description: 'Отличная согласованность',
    };
  } else if (cv <= 30) {
    gameState.consistency = {
      emoji: '🙂',
      description: 'Хорошая согласованность',
    };
  } else if (cv <= 50) {
    gameState.consistency = {
      emoji: '😕',
      description: 'Средняя согласованность',
    };
  } else {
    gameState.consistency = {
      emoji: '😬',
      description: 'Большой разброс мнений',
    };
  }
}