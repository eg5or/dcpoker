import { useEffect, useRef, useState } from 'react';

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
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevRevealState, setPrevRevealState] = useState<boolean>(isRevealed);
  const [prevVoteState, setPrevVoteState] = useState<number | null>(user.vote);
  const [badgesFloating, setBadgesFloating] = useState(false);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const [isAnimatingManually, setIsAnimatingManually] = useState(false);

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

  // В нашей новой логике знак вопроса отображается только когда пользователь проголосовал
  const hasVoted = user.vote !== null;
  
  // Отображаемое значение голоса - для перевернутой карточки
  const voteDisplay = user.vote === 0.1 ? '☕️' : user.vote === 0.5 ? '½' : user.vote;

  // Очистка анимаций при размонтировании компонента
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Эффект для отслеживания изменений состояния вскрытия и голоса
  useEffect(() => {
    // Если анимация уже идет, не запускаем новую
    if (isFlipping) return;

    // Если карты только что вскрыли и у пользователя есть голос
    if (!prevRevealState && isRevealed && user.vote !== null) {
      startFlipAnimation('reveal');
    }
    
    // Если карты сбросили 
    else if (prevRevealState && !isRevealed) {
      startFlipAnimation('reset');
    }

    // Сохраняем текущее состояние для следующего сравнения
    setPrevRevealState(isRevealed);
    setPrevVoteState(user.vote);
  }, [isRevealed, user.vote, prevRevealState, prevVoteState, isCurrentUser, isFlipping]);

  const startFlipAnimation = (type: 'reveal' | 'reset') => {
    if (!cardInnerRef.current) return;
    
    // Отмечаем, что анимация началась
    setIsFlipping(true);
    setIsAnimatingManually(true);
    setBadgesFloating(true);
    
    // Сбрасываем значения
    animationStartTimeRef.current = null;
    
    // Запускаем анимацию плавающих бейджиков
    setTimeout(() => setBadgesFloating(false), 1000);
    
    const flipCard = (timestamp: number) => {
      if (!cardInnerRef.current) return;
      
      // Инициализируем время начала анимации
      if (!animationStartTimeRef.current) {
        animationStartTimeRef.current = timestamp;
      }
      
      // Вычисляем прогресс анимации (0 to 1)
      const elapsed = timestamp - animationStartTimeRef.current;
      const duration = 800; // 800ms
      let progress = Math.min(elapsed / duration, 1);
      
      // Функция для плавности анимации
      const easeInOutQuad = (t: number) => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      };
      
      progress = easeInOutQuad(progress);
      
      // Анимация переворота и других свойств
      let rotateY, scale, elevation;
      
      if (type === 'reveal') {
        rotateY = progress * 180; // от 0 до 180 градусов
      } else {
        rotateY = 180 - progress * 180; // от 180 до 0 градусов
      }
      
      // Эффект масштабирования для ощущения объема
      scale = 1 + Math.sin(progress * Math.PI) * 0.1; // Увеличение в середине анимации
      
      // Эффект подъема карточки
      elevation = Math.sin(progress * Math.PI) * 20; // Подъем в середине анимации
      
      // Применяем трансформацию
      cardInnerRef.current.style.transform = `
        rotateY(${rotateY}deg) 
        scale(${scale}) 
        translateZ(${elevation}px)
      `;
      
      // Интенсивность тени в зависимости от прогресса
      const shadowIntensity = Math.sin(progress * Math.PI) * 30 + 10;
      cardInnerRef.current.style.boxShadow = `0 ${shadowIntensity}px ${shadowIntensity * 2}px rgba(0, 0, 0, 0.3)`;
      
      // Продолжаем анимацию, если она не завершена
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(flipCard);
      } else {
        // Завершаем анимацию
        cardInnerRef.current.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
        
        // Устанавливаем конечное состояние в зависимости от типа анимации
        if (type === 'reveal') {
          cardInnerRef.current.style.transform = 'rotateY(180deg)';
        } else {
          cardInnerRef.current.style.transform = 'rotateY(0deg)';
        }
        
        cardInnerRef.current.style.boxShadow = '';
        
        setIsFlipping(false);
        
        // Через небольшую задержку после завершения анимации
        // разрешаем React контролировать трансформацию
        setTimeout(() => {
          setIsAnimatingManually(false);
        }, 50);
        
        animationStartTimeRef.current = null;
        animationFrameRef.current = null;
      }
    };
    
    // Устанавливаем начальное состояние
    cardInnerRef.current.style.transition = 'none';
    
    // Запускаем анимацию
    animationFrameRef.current = requestAnimationFrame(flipCard);
  };

  // Определение стилей для бейджиков с эмодзи
  const badgesClass = badgesFloating ? "emoji-counters float-badges" : "emoji-counters";

  return (
    <div 
      data-user-id={user.id}
      className="card-container relative h-[140px] sm:h-[160px] select-none"
      onClick={() => !isCurrentUser && user.isOnline && !isFlipping && onThrowEmoji(user.id, selectedEmoji)}
    >
      {/* Бейджики с эмодзи (всегда поверх карточки) */}
      {totalAttacks > 0 && (
        <div className={badgesClass}>
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
      
      {/* Контейнер для 3D-вращения */}
      <div 
        ref={cardInnerRef}
        className="card-inner w-full h-full" 
        style={!isAnimatingManually ? { transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)' } : {}}
      >
        {/* Передняя сторона карточки (нераскрытая) */}
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
          
          <div className="flex-grow flex items-center justify-center">
            {hasVoted && (
              <span className="text-3xl sm:text-4xl font-bold text-gray-500">?</span>
            )}
          </div>
        </div>

        {/* Задняя сторона карточки (раскрытая) */}
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
          
          <div className="flex-grow flex items-center justify-center">
            {hasVoted && (
              <span className={`text-3xl sm:text-4xl font-bold ${
                user.changedVoteAfterReveal 
                  ? 'text-yellow-500'
                  : 'text-white'
              }`}>
                {voteDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 