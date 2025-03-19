
interface User {
  id: string;
  name: string;
  vote: number | null;
  isOnline: boolean;
  changedVoteAfterReveal?: boolean;
  poopAttacks: number;
}

interface UserCardProps {
  user: User;
  isRevealed: boolean;
  currentUserId: string | undefined;
  onThrowPoop: (targetId: string) => void;
}

export function UserCard({ user, isRevealed, currentUserId, onThrowPoop }: UserCardProps) {
  const isCurrentUser = user.id === currentUserId;

  return (
    <div
      data-user-id={user.id}
      className={`bg-gray-800 p-6 rounded-lg shadow-lg relative ${
        user.changedVoteAfterReveal ? 'ring-2 ring-yellow-500' : ''
      } ${
        isCurrentUser 
          ? 'bg-gradient-to-br from-blue-900 to-gray-800 ring-2 ring-blue-400 transform hover:scale-105 transition-all' 
          : ''
      }`}
      onClick={() => !isCurrentUser && onThrowPoop(user.id)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl ${isCurrentUser ? 'text-blue-300 font-bold' : 'text-white'}`}>
          {isCurrentUser ? `${user.name} (Вы)` : user.name}
        </h3>
        <div className="flex items-center gap-2">
          {user.poopAttacks > 0 && (
            <span className="poop-counter bg-brown-500 px-2 py-1 rounded-full text-white font-bold animate-subtle-pulse flex items-center gap-1">
              <span className="text-lg">💩</span>
              <span className="bg-brown-600 px-2 py-0.5 rounded-full text-sm">
                {user.poopAttacks}
              </span>
            </span>
          )}
          <span className={`h-3 w-3 rounded-full ${
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