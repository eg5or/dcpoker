import { User } from './UserCardTypes';
import { getRelativeTimeString } from './UserCardUtils';

interface CardBackProps {
  user: User;
  isCurrentUser: boolean;
  hasVoted: boolean;
  voteDisplay: string | number;
  style?: React.CSSProperties;
}

export function CardBack({ user, isCurrentUser, hasVoted, voteDisplay, style }: CardBackProps) {
  return (
    <div 
      className={`card-back rounded-lg p-4 sm:p-6 user-card ${
        user.changedVoteAfterReveal 
          ? 'bg-gradient-to-br from-yellow-900 to-gray-800 ring-2 ring-yellow-500' 
          : isCurrentUser 
            ? 'bg-gradient-to-br from-blue-900 to-gray-800 ring-2 ring-blue-400' 
            : user.isOnline 
              ? 'bg-gray-800' 
              : 'bg-gray-800 opacity-40'
      }`}
      style={style}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className={`text-lg sm:text-xl truncate max-w-[80%] ${
          user.changedVoteAfterReveal 
            ? 'text-yellow-300 font-bold' 
            : isCurrentUser 
              ? 'text-blue-300 font-bold' 
              : 'text-white'
        }`}>
          {isCurrentUser ? `${user.name} (Вы)` : user.name}
          {user.changedVoteAfterReveal && (
            <span className="ml-2 text-xs text-yellow-500">(изменено)</span>
          )}
        </h3>
        <div>
          <span className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full inline-block ${
            user.isOnline ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center">
        {hasVoted && (
          <span className={`text-3xl sm:text-4xl font-bold ${
            user.changedVoteAfterReveal 
              ? 'text-yellow-500'
              : 'text-white'
          }`}>
            {voteDisplay}
          </span>
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