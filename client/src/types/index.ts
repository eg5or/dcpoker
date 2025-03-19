export type User = {
  id: string;
  name: string;
  isOnline: boolean;
  vote: number | null;
  changedVoteAfterReveal?: boolean;
  joinedAt: number; // UTC timestamp в миллисекундах
  lastSeen?: number; // UTC timestamp последнего посещения
  emojiAttacks: {
    [emoji: string]: number;
  };
};

export type Consistency = {
  emoji: string;
  description: string;
};

export type GameState = {
  users: User[];
  isRevealed: boolean;
  averageVote: number | null;
  usersChangedVoteAfterReveal: string[];
  consistency: Consistency | null;
};

export const FIBONACCI_SEQUENCE = [0.1, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export type PoopTrajectory = {
  startX: number;  // начальная позиция X в процентах от ширины экрана
  startY: number;  // начальная позиция Y в процентах от высоты экрана
  angle: number;   // угол броска в радианах
  speed: number;   // начальная скорость
};

export type ServerEvents = {
  'game:state': (state: GameState) => void;
  'user:joined': (user: User) => void;
  'user:left': (userId: string) => void;
  'user:voted': (userId: string) => void;
  'votes:revealed': (state: GameState) => void;
  'force:logout': () => void;
  'emoji:thrown': (targetUserId: string, fromUserId: string, emoji: string, trajectory: EmojiTrajectory) => void;
};

export type ClientEvents = {
  'user:join': (name: string) => void;
  'user:vote': (value: number) => void;
  'votes:reveal': () => void;
  'game:reset': () => void;
  'recalculate:average': () => void;
  'users:reset': () => void;
  'throw:emoji': (targetUserId: string, emoji: string) => void;
}; 