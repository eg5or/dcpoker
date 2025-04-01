export type User = {
  id: string;
  name: string;
  isOnline: boolean;
  vote: number | null;
  changedVoteAfterReveal?: boolean;
  joinedAt: number;
  emojiAttacks: {
    [emoji: string]: number;
  };
  lastResetTime?: number;
  lastShakeTime?: number;
};

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

export interface Room {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  emoji?: string;
  description?: string;
  createdAt: string;
  lastActivity: string;
  settings?: {
    votingSequence: number[];
    allowObservers: boolean;
    autoReveal: boolean;
  };
}

export const FIBONACCI_SEQUENCE = [0.1, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export interface EmojiTrajectory {
  startX: number; // начальная позиция X в процентах от ширины экрана
  startY: number; // начальная позиция Y в процентах от высоты экрана
  angle: number; // угол броска в радианах
  speed: number; // начальная скорость
}

export interface ServerEvents {
  'game:state': (state: GameState) => void;
  'user:joined': (user: User) => void;
  'user:left': (userId: string) => void;
  'user:voted': (userId: string) => void;
  'votes:revealed': (state: GameState) => void;
  'force:logout': () => void;
  'room:error': (errorMessage: string) => void;
  'emoji:thrown': (
    targetUserId: string,
    fromUserId: string,
    emoji: string,
    trajectory: EmojiTrajectory,
    throwTime: number,
    placement: { x: number; y: number; rotation: number }
  ) => void;
  'emojis:fall': (fallTime: number) => void;
  'emojis:shake': (userId: string) => void;
}

export interface ClientEvents {
  'room:join': (roomCode: string, name: string) => void;
  'user:vote': (value: number) => void;
  'votes:reveal': () => void;
  'game:reset': () => void;
  'recalculate:average': () => void;
  'users:reset': () => void;
  'throw:emoji': (
    targetUserId: string, 
    emoji: string, 
    placement: { x: number; y: number; rotation: number }
  ) => void;
  'emojis:fall': () => void;
  'emojis:shake': (userId: string) => void;
}

export const AVAILABLE_EMOJIS = [
  '💩', // какашка (классика!)
  '🤡', // клоун (когда оценка совсем несерьезная)
  '🗿', // каменная голова (когда кто-то слишком упёртый)
  '🤌', // итальянский жест (мама миа, что за оценка!)
  '🫠', // тающий смайлик (когда всё плохо)
  '🤪', // безумный смайлик (когда оценка странная)
  '🧐', // смайлик с моноклем (для умных мыслей)
  '🦥', // ленивец (когда оценка слишком медленная/ленивая)
  '👻', // призрак (для мистических оценок)
  '🤯', // взрывающаяся голова (когда оценка шокирует)
];
