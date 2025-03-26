export interface User {
  id: string;
  name: string;
  vote: number | null;
  isOnline: boolean;
  changedVoteAfterReveal?: boolean;
  emojiAttacks: {
    [emoji: string]: number;
  };
  joinedAt?: number;
}

export interface UserCardProps {
  user: User;
  isRevealed: boolean;
  currentUserId: string | undefined;
  onThrowEmoji: (targetId: string) => void;
  selectedEmoji: string;
  easterEggState?: 'tilt' | 'fall' | 'shatter' | 'reset';
  onVoteAfterReveal?: () => void;
  socket?: any;
}

export type FlipAnimationType = 'reveal' | 'reset'; 