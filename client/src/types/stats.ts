// Интерфейс для эмодзи статистики
export interface EmojiStat {
  emoji: string;
  count: number;
}

// Интерфейс для статистики по оценкам
export interface VoteStat {
  value: number;
  count: number;
}

// Интерфейс для статистики пользователя
export interface UserStats {
  userId: string;
  totalSessions: number;
  completedSessions: number;
  votesStats: {
    total: number;
    values: VoteStat[];
    changedAfterReveal: number;
  };
  emojisStats: {
    sent: EmojiStat[];
    received: EmojiStat[];
  };
  lastUpdated: Date;
}

// Интерфейс для глобальной статистики
export interface GlobalStats {
  totalSessions: number;
  completedSessions: number;
  totalUsers: number;
  activeUsers: number;
  votesStats: {
    total: number;
    values: VoteStat[];
    averagePerSession: number;
    changedAfterReveal: number;
  };
  emojisStats: {
    total: number;
    topEmojis: EmojiStat[];
  };
  lastUpdated: Date;
} 