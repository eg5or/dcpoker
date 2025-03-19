export interface User {
  id: string;
  name: string;
  vote: number | null;
  isOnline: boolean;
  changedVoteAfterReveal?: boolean;
  joinedAt: number;
  emojiAttacks: {
    [emoji: string]: number;
  };
}

export interface Consistency {
  emoji: string;
  description: string;
}

export interface GameState {
  users: User[];
  isRevealed: boolean;
  averageVote: number | null;
  usersChangedVoteAfterReveal: string[];
  consistency: Consistency | null;
}

export const FIBONACCI_SEQUENCE = [0.1, 0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const AVAILABLE_EMOJIS = [
  '💩', // какашка
  '🚀', // ракета
  '🔥', // огонь
  '🤣', // сильный смех
  '👍', // палец вверх
  '🎯', // цель
  '💯', // 100 баллов
  '🧠', // мозг
  '🍑', // персик
  '💪'  // сила
]; 