import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { AVAILABLE_EMOJIS, GameState } from '../types';
import { AverageScore } from './AverageScore';
import { ConfirmDialog } from './ConfirmDialog';
import { EmojiSelector } from './EmojiSelector';
import { ErrorMessage } from './ErrorMessage';
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
  const [prevGameState, setPrevGameState] = useState<GameState>(gameState);
  const [confirmRevealDialogOpen, setConfirmRevealDialogOpen] = useState(false);
  const [confirmResetUsersDialogOpen, setConfirmResetUsersDialogOpen] = useState(false);
  const [easterEggState, setEasterEggState] = useState<'tilt' | 'fall' | 'shatter' | 'reset' | undefined>(undefined);

  // Сохраняем предыдущее состояние игры для анимации
  useEffect(() => {
    setPrevGameState(gameState);
  }, [gameState]);

  // Обработчик для сброса с анимацией
  const handleReset = () => {
    // Сбрасываем пасхалку при сбросе голосов
    setEasterEggState('reset');
    onReset();
  };

  // Проверка, все ли онлайн пользователи проголосовали
  const checkAllOnlineUsersVoted = () => {
    const onlineUsers = gameState.users.filter(user => user.isOnline);
    const onlineUsersWithVotes = onlineUsers.filter(user => user.vote !== null);
    return onlineUsersWithVotes.length === onlineUsers.length;
  };

  // Обработчик для кнопки "Показать карты"
  const handleRevealRequest = () => {
    if (checkAllOnlineUsersVoted()) {
      // Если все проголосовали, сразу показываем карты
      onReveal();
    } else {
      // Иначе показываем диалог подтверждения
      setConfirmRevealDialogOpen(true);
    }
  };

  // Обработчик для кнопки "Сбросить всех пользователей"
  const handleResetUsersRequest = () => {
    setConfirmResetUsersDialogOpen(true);
  };

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

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8">
      <ErrorMessage message={error} />
      
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <GameControls
            onReveal={handleRevealRequest}
            onReset={handleReset}
            onResetUsers={handleResetUsersRequest}
          />
          <div className="flex items-center bg-gray-800 p-2 rounded-lg w-full sm:w-auto">
            <p className="text-white mr-3 text-sm whitespace-nowrap">Выберите эмодзи:</p>
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
                easterEggState={easterEggState}
                onVoteAfterReveal={handleVoteAfterReveal}
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
          onCoffeeEasterEgg={handleCoffeeEasterEgg}
        />

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
            onResetUsers();
          }}
          onCancel={() => setConfirmResetUsersDialogOpen(false)}
        />
      </div>
    </div>
  );
} 