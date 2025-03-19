import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { AVAILABLE_EMOJIS, GameState } from '../types';
import { AverageScore } from './AverageScore';
import { EmojiSelector } from './EmojiSelector';
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
  onThrowEmoji: (targetId: string, emoji: string) => void;
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
  onThrowEmoji,
  sequence
}: GameBoardProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>(AVAILABLE_EMOJIS[0]);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded">
          {error}
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <GameControls
            currentVote={currentVote}
            onReveal={onReveal}
            onReset={onReset}
            onResetUsers={onResetUsers}
          />
          <div className="flex items-center bg-gray-800 p-2 rounded-lg">
            <p className="text-white mr-3 text-sm">Выберите эмодзи:</p>
            <EmojiSelector 
              selectedEmoji={selectedEmoji} 
              onSelectEmoji={setSelectedEmoji} 
            />
          </div>
        </div>

        <VoteChangeAlert
          changedUsers={gameState.usersChangedVoteAfterReveal}
          onRecalculate={onRecalculateAverage}
        />
        
        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">
            Нажмите на карточку участника, чтобы бросить в него выбранный эмодзи {selectedEmoji}
          </p>
        </div>

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
                onThrowEmoji={(targetId) => onThrowEmoji(targetId, selectedEmoji)}
                selectedEmoji={selectedEmoji}
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