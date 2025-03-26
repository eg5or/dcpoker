import { useCallback, useEffect, useRef, useState } from 'react';
import { CardBack } from './CardBack';
import { CardFront } from './CardFront';
import { ShakeButton } from './ShakeButton';
import {
  resetEasterEggAnimation,
  startFallingAnimation,
  startFlipAnimation,
  startShatterAnimation,
  startTiltAnimation
} from './UserCardAnimations';
import { EmojiCounters } from './UserCardEmoji';
import { UserCardProps } from './UserCardTypes';

export function UserCard({ 
  user, 
  isRevealed, 
  currentUserId, 
  onThrowEmoji, 
  easterEggState,
  onVoteAfterReveal,
  socket
}: UserCardProps) {
  const isCurrentUser = user.id === currentUserId;
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevRevealState, setPrevRevealState] = useState<boolean>(isRevealed);
  const [prevVoteState, setPrevVoteState] = useState<number | null>(user.vote);
  const [clickCount, setClickCount] = useState(0);
  const [currentEasterEggState, setCurrentEasterEggState] = useState<string | undefined>(undefined);
  const [isAnimatingManually, setIsAnimatingManually] = useState(false);

  const cardInnerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const easterEggAnimationFrameRef = useRef<number | null>(null);
  const shardsRef = useRef<HTMLDivElement[]>([]);

  // Получаем и сортируем эмодзи по количеству
  const emojiCounts = Object.entries(user.emojiAttacks || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // В нашей новой логике знак вопроса отображается только когда пользователь проголосовал
  const hasVoted = user.vote !== null;
  
  // Отображаемое значение голоса - для перевернутой карточки
  const voteDisplay = user.vote === null ? '' : user.vote === 0.1 ? '☕️' : user.vote === 0.5 ? '½' : user.vote;

  // Проверяем, есть ли прилипшие эмодзи
  const hasStuckEmojis = useCallback(() => {
    return Object.values(user.emojiAttacks || {}).some(count => count > 0);
  }, [user.emojiAttacks]);

  // Обработчик оттряхивания эмодзи
  const handleShakeEmojis = useCallback(() => {
    if (!socket || !isCurrentUser) return;
    socket.emit('emojis:shake', user.id);
  }, [socket, isCurrentUser, user.id]);

  // Обработчик события оттряхивания
  useEffect(() => {
    if (!socket) return;

    const handleShake = (userId: string) => {
      if (userId !== user.id || !cardContainerRef.current) return;

      const stuckEmojis = cardContainerRef.current.querySelectorAll('.stuck-emoji');
      stuckEmojis.forEach((emoji, index) => {
        // Сохраняем текущий угол поворота
        const currentTransform = window.getComputedStyle(emoji).transform;
        const currentRotation = currentTransform.includes('rotate') 
          ? parseFloat(currentTransform.split('rotate(')[1]) 
          : 0;
        
        // Устанавливаем начальный угол для анимации
        (emoji as HTMLElement).style.setProperty('--initial-rotation', `${currentRotation}deg`);
        
        // Добавляем небольшую задержку для каждого следующего эмодзи
        setTimeout(() => {
          emoji.classList.add('falling');
        }, index * 50);
        
        // Удаляем эмодзи после завершения анимации
        emoji.addEventListener('animationend', () => {
          emoji.remove();
        }, { once: true });
      });
    };

    socket.on('emojis:shake', handleShake);

    return () => {
      socket.off('emojis:shake', handleShake);
    };
  }, [socket, user.id]);

  // Обработка пасхалки
  useEffect(() => {
    if (isCurrentUser && user.vote === 0.1 && easterEggState) {
      // Если пасхалка активирована для текущего пользователя и он выбрал кофе
      setCurrentEasterEggState(easterEggState);
      
      const refs = {
        cardInnerRef,
        cardContainerRef,
        animationFrameRef,
        animationStartTimeRef,
        easterEggAnimationFrameRef,
        shardsRef
      };

      // Запускаем соответствующую анимацию
      if (easterEggState === 'tilt') {
        startTiltAnimation(clickCount, refs);
      } else if (easterEggState === 'fall') {
        startFallingAnimation(refs);
        
        // Автоматический переход к разбитию через время
        const timeout = setTimeout(() => {
          setCurrentEasterEggState('shatter');
        }, 1500);
        return () => clearTimeout(timeout);
      } else if (easterEggState === 'shatter') {
        startShatterAnimation(refs);
        
        // Сброс состояния через время
        const timeout = setTimeout(() => {
          resetEasterEggAnimation(refs);
          setCurrentEasterEggState(undefined);
        }, 3000);
        return () => clearTimeout(timeout);
      }
    } else if (easterEggState === 'reset') {
      // Сбрасываем пасхалку
      const refs = {
        cardInnerRef,
        cardContainerRef,
        animationFrameRef,
        animationStartTimeRef,
        easterEggAnimationFrameRef,
        shardsRef
      };
      resetEasterEggAnimation(refs);
      setCurrentEasterEggState(undefined);
    }
  }, [easterEggState, isCurrentUser, user.vote, clickCount]);

  // Очистка анимаций при размонтировании компонента
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (easterEggAnimationFrameRef.current) {
        cancelAnimationFrame(easterEggAnimationFrameRef.current);
      }
      
      // Очищаем осколки
      shardsRef.current.forEach(shard => {
        if (shard.parentNode) {
          shard.parentNode.removeChild(shard);
        }
      });
    };
  }, []);

  // Отдельный эффект для обновления prevRevealState
  useEffect(() => {
    setPrevRevealState(isRevealed);
  }, [isRevealed]);

  // Эффект для анимации
  useEffect(() => {
    // Если анимация уже идет, не запускаем новую
    if (isFlipping) return;
    
    // Проверяем, что пользователь онлайн, иначе не переворачиваем его карточку
    if (!user.isOnline) return;

    const refs = {
      cardInnerRef,
      cardContainerRef,
      animationFrameRef,
      animationStartTimeRef,
      easterEggAnimationFrameRef,
      shardsRef
    };

    // Проверяем, не проголосовал ли пользователь после раскрытия карт
    if (isRevealed && prevVoteState === null && user.vote !== null) {
      // Помечаем что голос был изменен после раскрытия
      user.changedVoteAfterReveal = true;
      startFlipAnimation('reveal', refs, () => {
        setIsFlipping(false);
        setIsAnimatingManually(false);
      });
      // Вызываем callback для показа баннера
      onVoteAfterReveal?.();
    }
    // Если карты только что вскрыли
    else if (!prevRevealState && isRevealed) {
      // Анимируем падение эмодзи перед переворотом карточки
      if (cardContainerRef.current) {
        const stuckEmojis = cardContainerRef.current.querySelectorAll('.stuck-emoji');
        stuckEmojis.forEach((emoji, index) => {
          // Сохраняем текущий угол поворота
          const currentTransform = window.getComputedStyle(emoji).transform;
          const currentRotation = currentTransform.includes('rotate') 
            ? parseFloat(currentTransform.split('rotate(')[1]) 
            : 0;
          
          // Устанавливаем начальный угол для анимации
          (emoji as HTMLElement).style.setProperty('--initial-rotation', `${currentRotation}deg`);
          
          // Добавляем небольшую задержку для каждого следующего эмодзи
          setTimeout(() => {
            emoji.classList.add('falling');
          }, index * 50);
          
          // Удаляем эмодзи после завершения анимации
          emoji.addEventListener('animationend', () => {
            emoji.remove();
          }, { once: true });
        });
        
        // Даем время для начала анимации падения перед переворотом
        setTimeout(() => {
          // Переворачиваем только если есть голос
          if (hasVoted) {
            startFlipAnimation('reveal', refs, () => {
              setIsFlipping(false);
              setIsAnimatingManually(false);
            });
          }
        }, 100);
      }
    }
    // Если карты сбросили 
    else if (prevRevealState && !isRevealed) {
      // Анимируем падение эмодзи перед переворотом карточки
      if (cardContainerRef.current) {
        const stuckEmojis = cardContainerRef.current.querySelectorAll('.stuck-emoji');
        if (stuckEmojis.length > 0) {
          stuckEmojis.forEach((emoji, index) => {
            // Сохраняем текущий угол поворота
            const currentTransform = window.getComputedStyle(emoji).transform;
            const currentRotation = currentTransform.includes('rotate') 
              ? parseFloat(currentTransform.split('rotate(')[1]) 
              : 0;
            
            // Устанавливаем начальный угол для анимации
            (emoji as HTMLElement).style.setProperty('--initial-rotation', `${currentRotation}deg`);
            
            // Добавляем небольшую задержку для каждого следующего эмодзи
            setTimeout(() => {
              emoji.classList.add('falling');
            }, index * 50);
            
            // Удаляем эмодзи после завершения анимации
            emoji.addEventListener('animationend', () => {
              emoji.remove();
            }, { once: true });
          });
          
          // Даем время для начала анимации падения перед переворотом
          setTimeout(() => {
            if (hasVoted) {
              startFlipAnimation('reset', refs, () => {
                setIsFlipping(false);
                setIsAnimatingManually(false);
              });
            }
          }, 100);
        } else {
          // Если нет эмодзи, просто переворачиваем карточку
          if (hasVoted) {
            startFlipAnimation('reset', refs, () => {
              setIsFlipping(false);
              setIsAnimatingManually(false);
            });
          }
        }
      }
    }

    // Сохраняем текущее состояние голоса для следующего сравнения
    setPrevVoteState(user.vote);
  }, [isRevealed, user.vote, prevRevealState, prevVoteState, isCurrentUser, isFlipping, user.isOnline, hasVoted, onVoteAfterReveal]);

  // Расчет стилей для внутреннего контейнера карточки
  const getCardStyles = () => {
    // Если карточка в обычном состоянии, передаем управление React
    if (!isAnimatingManually && !currentEasterEggState) {
      return {
        transform: isRevealed && hasVoted ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transformOrigin: 'center center'
      };
    }
    
    // В остальных случаях управляет JavaScript-анимация
    return { 
      transformOrigin: 'center center'
    };
  };
  
  return (
    <div 
      ref={cardContainerRef}
      data-user-id={user.id}
      className="card-container relative h-[140px] sm:h-[160px] select-none"
      onClick={() => {
        if (!isCurrentUser && user.isOnline && !isFlipping) {
          onThrowEmoji(user.id);
        } else if (isCurrentUser && user.vote === 0.1) {
          setClickCount(prev => {
            const newCount = prev + 1;
            const refs = {
              cardInnerRef,
              cardContainerRef,
              animationFrameRef,
              animationStartTimeRef,
              easterEggAnimationFrameRef,
              shardsRef
            };
            if (newCount >= 4 && newCount < 9) {
              startTiltAnimation(newCount, refs);
            } else if (newCount === 9) {
              startFallingAnimation(refs);
            }
            return newCount;
          });
        }
      }}
    >
      {/* Кнопка оттряхивания эмодзи */}
      {isCurrentUser && hasStuckEmojis() && (
        <ShakeButton onClick={(e) => {
          e.stopPropagation();
          handleShakeEmojis();
        }} />
      )}

      {/* Бейджики с эмодзи */}
      <EmojiCounters 
        emojiCounts={emojiCounts}
        isFloating={false}
      />
      
      {/* Контейнер для 3D-вращения */}
      <div 
        ref={cardInnerRef}
        className="card-inner w-full h-full" 
        style={getCardStyles()}
      >
        {/* Передняя сторона карточки (нераскрытая) */}
        <CardFront 
          user={user}
          isCurrentUser={isCurrentUser}
          hasVoted={hasVoted}
          isRevealed={isRevealed}
        />

        {/* Задняя сторона карточки (раскрытая) */}
        <CardBack 
          user={user}
          isCurrentUser={isCurrentUser}
          hasVoted={hasVoted}
          voteDisplay={voteDisplay}
        />
      </div>
    </div>
  );
} 