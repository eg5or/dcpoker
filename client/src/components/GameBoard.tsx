import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Room } from '../types';
import { AverageScore } from './AverageScore';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorMessage } from './ErrorMessage';
import { GlobalStatsPanel } from './GlobalStatsPanel';
import { UserCard } from './UserCard';
import { VoteChangeAlert } from './VoteChangeAlert';
import { VotingPanel } from './VotingPanel';

interface GameBoardProps {
  socket?: Socket | null;
  currentUser?: string;
  currentVote: number | null;
  gameState: GameState;
  error?: string | null;
  isGameLoading?: boolean;
  onVote: (value: number) => void;
  onReveal: () => void;
  onReset: () => void;
  onResetUsers?: () => void;
  onRecalculateAverage: () => void;
  onThrowEmoji: (targetId: string, emoji: string) => void;
  sequence?: number[];
  selectedEmoji: string;
  onEmojiChange?: (emoji: string) => void;
  selectedRoom?: Room | null;
}

export function GameBoard({
  socket,
  currentUser,
  currentVote,
  gameState,
  error,
  isGameLoading,
  onVote,
  onReveal,
  onReset,
  onResetUsers,
  onRecalculateAverage,
  onThrowEmoji,
  sequence = [],
  selectedEmoji,
  onEmojiChange,
  selectedRoom
}: GameBoardProps) {
  const [_, setPrevGameState] = useState<GameState>(gameState);
  const [confirmRevealDialogOpen, setConfirmRevealDialogOpen] = useState(false);
  const [confirmResetUsersDialogOpen, setConfirmResetUsersDialogOpen] = useState(false);
  const [easterEggState, setEasterEggState] = useState<
    'tilt' | 'fall' | 'shatter' | 'reset' | undefined
  >(undefined);

  // Сохраняем предыдущее состояние игры для анимации
  useEffect(() => {
    setPrevGameState(gameState);
  }, [gameState]);

  // Обработчик для пасхалки с кофе
  const handleCoffeeEasterEgg = (state: 'tilt' | 'fall' | 'shatter' | 'reset') => {
    setEasterEggState(state);
  };

  // Обработчик для голосования после раскрытия карт
  const handleVoteAfterReveal = () => {
    // Если уже есть измененные голоса, не нужно показывать баннер снова
    if (gameState.usersChangedVoteAfterReveal.length === 0) {
      onRecalculateAverage();
    }
  };

  if (isGameLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-xl">Подключение к комнате...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8">
      {error && <ErrorMessage message={error} />}

      <div className="max-w-6xl mx-auto">
        {selectedRoom && (
          <div className="mb-6 bg-gray-800 p-4 rounded-lg">
            <h1 className="text-2xl font-bold mb-2">
              {selectedRoom.code.substring(0, 2)} {selectedRoom.name}
            </h1>
            {selectedRoom.description && (
              <p className="text-gray-400">{selectedRoom.description}</p>
            )}
          </div>
        )}

        <VoteChangeAlert
          changedUsers={gameState.usersChangedVoteAfterReveal}
          onRecalculate={onRecalculateAverage}
        />

        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">
            Нажмите на карточку участника, чтобы бросить в него выбранный эмодзи
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
                currentUserId={currentUser || socket?.id}
                onThrowEmoji={(targetId) => onThrowEmoji(targetId, selectedEmoji)}
                selectedEmoji={selectedEmoji}
                easterEggState={easterEggState}
                onVoteAfterReveal={handleVoteAfterReveal}
                socket={socket}
              />
            ))}
        </div>

        {gameState.isRevealed && (
          <AverageScore averageVote={gameState.averageVote} consistency={gameState.consistency} />
        )}

        <VotingPanel
          currentVote={currentVote}
          onVote={onVote}
          sequence={sequence}
          onCoffeeEasterEgg={handleCoffeeEasterEgg}
        />

        <div className="mt-8 mb-8">
          <GlobalStatsPanel />
        </div>

        {/* Диалоговое окно подтверждения вскрытия карт */}
        <ConfirmDialog
          isOpen={confirmRevealDialogOpen}
          message="Не все онлайн пользователи сделали выбор, вы уверены, что хотите вскрыть карты?"
          onConfirm={() => {
            setConfirmRevealDialogOpen(false);
            onReveal();
          }}
          onCancel={() => setConfirmRevealDialogOpen(false)}
        />

        {/* Диалоговое окно подтверждения сброса всех пользователей */}
        <ConfirmDialog
          isOpen={confirmResetUsersDialogOpen}
          message="Вы уверены, что хотите сбросить всех пользователей? Это действие выведет всех участников из покера, и им потребуется заново подключиться для продолжения игры."
          confirmLabel="Сбросить"
          cancelLabel="Отмена"
          onConfirm={() => {
            setConfirmResetUsersDialogOpen(false);
            if (onResetUsers) onResetUsers();
          }}
          onCancel={() => setConfirmResetUsersDialogOpen(false)}
        />
      </div>
    </div>
  );
}
