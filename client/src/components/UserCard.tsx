interface User {
  id: string;
  name: string;
  vote: number | null;
  isOnline: boolean;
  changedVoteAfterReveal?: boolean;
  emojiAttacks: {
    [emoji: string]: number;
  };
}

interface UserCardProps {
  user: User;
  isRevealed: boolean;
  currentUserId: string | undefined;
  onThrowEmoji: (targetId: string, emoji: string) => void;
  selectedEmoji: string;
}

export function UserCard({ user, isRevealed, currentUserId, onThrowEmoji, selectedEmoji }: UserCardProps) {
  const isCurrentUser = user.id === currentUserId;

  // Получаем и сортируем эмодзи по количеству
  const emojiCounts = Object.entries(user.emojiAttacks || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  // Берем только топ-3 эмодзи для отображения
  const topEmojis = emojiCounts.slice(0, 3);
  
  // Количество скрытых эмодзи
  const hiddenEmojiCount = emojiCounts.length > 3 ? emojiCounts.length - 3 : 0;
  
  // Общее количество атак
  const totalAttacks = emojiCounts.reduce((sum, [_, count]) => sum + count, 0);

  // Определяем, должно ли быть показано значение оценки
  const showActualVote = user.vote !== null && (isRevealed || isCurrentUser);
  const showQuestionMark = user.vote !== null && !isRevealed && !isCurrentUser;
  
  // Отображаемое значение голоса
  const voteDisplay = user.vote === 0.1 ? '☕️' : user.vote === 0.5 ? '½' : user.vote;

  return (
    <div
      data-user-id={user.id}
      className={`bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg relative h-[140px] sm:h-[160px] flex flex-col select-none ${
        user.changedVoteAfterReveal ? 'ring-2 ring-yellow-500' : ''
      } ${
        isCurrentUser 
          ? 'bg-gradient-to-br from-blue-900 to-gray-800 ring-2 ring-blue-400 transform hover:scale-105 transition-all' 
          : user.isOnline 
            ? 'hover:bg-gray-700 cursor-pointer transition-colors' 
            : 'opacity-40 hover:opacity-70 cursor-pointer transition-opacity'
      }`}
      onClick={() => !isCurrentUser && user.isOnline && onThrowEmoji(user.id, selectedEmoji)}
    >
      {totalAttacks > 0 && (
        <div className="emoji-counters select-none">
          {topEmojis.map(([emoji, count]) => (
            <span key={emoji} className="emoji-counter animate-subtle-pulse">
              <span className="text-base sm:text-lg">{emoji}</span>
              <span className="bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm">
                {count}
              </span>
            </span>
          ))}
          {hiddenEmojiCount > 0 && (
            <span className="emoji-counter">
              <span className="bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full text-xs sm:text-sm" title="Другие эмодзи">
                +{hiddenEmojiCount}
              </span>
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className={`text-lg sm:text-xl truncate max-w-[80%] ${isCurrentUser ? 'text-blue-300 font-bold' : 'text-white'}`}>
          {isCurrentUser ? `${user.name} (Вы)` : user.name}
        </h3>
        <div>
          <span className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full inline-block ${
            user.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
      </div>
      
      <div className="flex-grow flex items-center justify-center">
        {showActualVote && (
          <span className={`text-3xl sm:text-4xl font-bold ${
            isRevealed 
              ? user.changedVoteAfterReveal 
                ? 'text-yellow-500'
                : 'text-white'
              : 'text-blue-300'
          }`}>
            {voteDisplay}
          </span>
        )}
        {showQuestionMark && (
          <span className="text-3xl sm:text-4xl font-bold text-gray-500">?</span>
        )}
      </div>
    </div>
  );
} 