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

  return (
    <div
      data-user-id={user.id}
      className={`bg-gray-800 p-6 rounded-lg shadow-lg relative ${
        user.changedVoteAfterReveal ? 'ring-2 ring-yellow-500' : ''
      } ${
        isCurrentUser 
          ? 'bg-gradient-to-br from-blue-900 to-gray-800 ring-2 ring-blue-400 transform hover:scale-105 transition-all' 
          : 'hover:bg-gray-700 cursor-pointer transition-colors'
      }`}
      onClick={() => !isCurrentUser && onThrowEmoji(user.id, selectedEmoji)}
    >
      {totalAttacks > 0 && (
        <div className="emoji-counters">
          {topEmojis.map(([emoji, count]) => (
            <span key={emoji} className="emoji-counter animate-subtle-pulse">
              <span className="text-lg">{emoji}</span>
              <span className="bg-gray-700 px-2 py-0.5 rounded-full text-sm">
                {count}
              </span>
            </span>
          ))}
          {hiddenEmojiCount > 0 && (
            <span className="emoji-counter">
              <span className="bg-gray-700 px-2 py-0.5 rounded-full text-sm" title="Другие эмодзи">
                +{hiddenEmojiCount}
              </span>
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl ${isCurrentUser ? 'text-blue-300 font-bold' : 'text-white'}`}>
          {isCurrentUser ? `${user.name} (Вы)` : user.name}
        </h3>
        <div>
          <span className={`h-3 w-3 rounded-full inline-block ${
            user.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
      </div>
      
      {user.vote !== null && (
        <div className="text-center">
          <span className={`text-4xl font-bold ${
            isRevealed 
              ? user.changedVoteAfterReveal 
                ? 'text-yellow-500'
                : 'text-white'
              : 'text-gray-500'
          }`}>
            {isRevealed ? (user.vote === 0.1 ? '☕️' : user.vote === 0.5 ? '½' : user.vote) : '?'}
          </span>
        </div>
      )}
    </div>
  );
} 