import { Socket } from 'socket.io-client';
import { GameState } from '../types';
import { AverageScore } from './AverageScore';
import { GameControls } from './GameControls';
import { UserCard } from './UserCard';
import { VoteChangeAlert } from './VoteChangeAlert';
import { VotingPanel } from './VotingPanel';

interface GameBoardProps {
  socket: Socket | null;
  currentVote: number | null;
  gameState: GameState;
  error: string | null;
  onVote: (value: number) => void;
  onReveal: () => void;
  onReset: () => void;
  onResetUsers: () => void;
  onRecalculateAverage: () => void;
  onThrowPoop: (targetId: string) => void;
  sequence: number[];
}

export function GameBoard({
  socket,
  currentVote,
  gameState,
  error,
  onVote,
  onReveal,
  onReset,
  onResetUsers,
  onRecalculateAverage,
  onThrowPoop,
  sequence
}: GameBoardProps) {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded">
          {error}
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <GameControls
          currentVote={currentVote}
          onReveal={onReveal}
          onReset={onReset}
          onResetUsers={onResetUsers}
        />

        <VoteChangeAlert
          changedUsers={gameState.usersChangedVoteAfterReveal}
          onRecalculate={onRecalculateAverage}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...gameState.users]
            .sort((a, b) => {
              if (a.isOnline && !b.isOnline) return -1;
              if (!a.isOnline && b.isOnline) return 1;
              if (a.isOnline === b.isOnline) {
                return b.joinedAt - a.joinedAt;
              }
              return 0;
            })
            .map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isRevealed={gameState.isRevealed}
                currentUserId={socket?.id}
                onThrowPoop={onThrowPoop}
              />
            ))}
        </div>

        {gameState.isRevealed && (
          <AverageScore
            averageVote={gameState.averageVote}
            consistency={gameState.consistency}
          />
        )}

        <VotingPanel
          currentVote={currentVote}
          onVote={onVote}
          sequence={sequence}
        />
      </div>
    </div>
  );
} 