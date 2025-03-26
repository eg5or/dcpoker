import { User } from './UserCardTypes';
import { getRelativeTimeString } from './UserCardUtils';

interface CardFrontProps {
  user: User;
  isCurrentUser: boolean;
  hasVoted: boolean;
  isRevealed: boolean;
}

export function CardFront({ user, isCurrentUser, hasVoted, isRevealed }: CardFrontProps) {
  return (
    <div 
      className={`card-front rounded-lg p-4 sm:p-6 user-card ${
        isCurrentUser 
          ? 'bg-gradient-to-br from-blue-900 to-gray-800 ring-2 ring-blue-400' 
          : user.isOnline 
            ? 'bg-gray-800 hover:bg-gray-700 cursor-pointer' 
            : 'bg-gray-800 opacity-40 hover:opacity-70 cursor-pointer'
      }`}
    >
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
      
      <div className="flex-grow flex flex-col items-center justify-center">
        {hasVoted && !isRevealed && (
          <span className="text-3xl sm:text-4xl font-bold text-gray-500">?</span>
        )}
        {!user.isOnline && user.joinedAt && (
          <span className="text-xs text-gray-500 mt-2 opacity-75">
            был {getRelativeTimeString(user.joinedAt)}
          </span>
        )}
      </div>
    </div>
  );
} 