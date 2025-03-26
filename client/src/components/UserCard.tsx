import { useCallback, useEffect, useRef, useState } from 'react';
import { CardBack } from './CardBack';
import { CardFront } from './CardFront';
import { ShakeButton } from './ShakeButton';
import {
  animateElements,
  resetEasterEggAnimation,
  startFallingAnimation,
  startFlipAnimation,
  startShatterAnimation,
  startTiltAnimation
} from './UserCardAnimations';
import { animateEmojisFalling, cleanupAnimations, handleEasterEgg } from './UserCardEffects';
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
  const [clickCount, setClickCount] = useState(0);
  const [_, setCurrentEasterEggState] = useState<string | undefined>(undefined);
  const shakeAnimationInProgress = useRef(false);
  const isPageVisible = useRef(true);
  const pendingShakeAnimation = useRef(false);

  const cardInnerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const easterEggAnimationFrameRef = useRef<number | null>(null);
  const shardsRef = useRef<HTMLDivElement[]>([]);
  const badgesRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const lastAnimationStateRef = useRef<{
    isRevealed: boolean;
    vote: number | null;
  }>({ isRevealed: false, vote: null });
  const isAnimatingRef = useRef(false);

  // Получаем и сортируем эмодзи по количеству
  const emojiCounts = Object.entries(user.emojiAttacks || {})
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const hasVoted = user.vote !== null;
  const voteDisplay = user.vote === null ? '' : user.vote === 0.1 ? '☕️' : user.vote === 0.5 ? '½' : user.vote;

  const hasStuckEmojis = useCallback(() => {
    return Object.values(user.emojiAttacks || {}).some(count => count > 0);
  }, [user.emojiAttacks]);

  // Отслеживаем видимость страницы
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisible.current = document.visibilityState === 'visible';
      
      // Если страница стала видимой и есть отложенная анимация тряски
      if (isPageVisible.current && pendingShakeAnimation.current && !shakeAnimationInProgress.current) {
        pendingShakeAnimation.current = false;
        const stuckEmojis = cardContainerRef.current?.querySelectorAll('.stuck-emoji');
        if (stuckEmojis?.length) {
          animateEmojisFalling(stuckEmojis);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleShakeEmojis = useCallback(() => {
    if (!socket || !isCurrentUser || shakeAnimationInProgress.current) return;
    
    // Устанавливаем флаг анимации
    shakeAnimationInProgress.current = true;
    
    // Добавляем тряску карточки
    if (cardContainerRef.current) {
      let startTime: number | null = null;
      const duration = 500; // 0.5 секунды
      let animationFrameId: number;
      
      const animateShake = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Функция для плавности
        const easeOutElastic = (t: number) => {
          const p = 0.3;
          return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        }
        
        // Создаем эффект тряски с затуханием
        const intensity = (1 - easeOutElastic(progress)) * 5;
        const shakeX = Math.sin(progress * Math.PI * 8) * intensity;
        const shakeY = Math.cos(progress * Math.PI * 6) * intensity;
        
        if (cardContainerRef.current) {
          cardContainerRef.current.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
        }
        
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateShake);
        } else {
          // Возвращаем карточку в исходное положение
          if (cardContainerRef.current) {
            cardContainerRef.current.style.transform = '';
          }
          // Сбрасываем флаг анимации после завершения
          shakeAnimationInProgress.current = false;
          // Отправляем событие только после завершения анимации
          socket.emit('emojis:shake', user.id);
        }
      };
      
      animationFrameId = requestAnimationFrame(animateShake);
      
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          shakeAnimationInProgress.current = false;
        }
      };
    }
  }, [socket, isCurrentUser, user.id]);

  // Обработчик события оттряхивания
  useEffect(() => {
    if (!socket) return;

    const handleShake = (userId: string) => {
      if (userId !== user.id || !cardContainerRef.current) return;
      
      // Если страница не видна, отмечаем что нужно выполнить анимацию позже
      if (!isPageVisible.current) {
        pendingShakeAnimation.current = true;
        return;
      }

      // Если анимация уже идет, пропускаем
      if (shakeAnimationInProgress.current) return;

      const stuckEmojis = cardContainerRef.current.querySelectorAll('.stuck-emoji');
      if (stuckEmojis.length > 0) {
        shakeAnimationInProgress.current = true;
        animateEmojisFalling(stuckEmojis);
        // После завершения анимации падения сбрасываем флаг
        setTimeout(() => {
          shakeAnimationInProgress.current = false;
          // Проверяем, не появились ли новые запросы на тряску
          if (pendingShakeAnimation.current && isPageVisible.current) {
            pendingShakeAnimation.current = false;
            handleShake(userId);
          }
        }, 1200); // Длительность анимации падения
      }
    };

    const handleResetEmojis = () => {
      if (!cardContainerRef.current) return;
      
      // Если страница не видна, отмечаем что нужно выполнить анимацию позже
      if (!isPageVisible.current) {
        pendingShakeAnimation.current = true;
        return;
      }

      // Если анимация уже идет, пропускаем
      if (shakeAnimationInProgress.current) return;

      const stuckEmojis = cardContainerRef.current.querySelectorAll('.stuck-emoji');
      if (stuckEmojis?.length) {
        shakeAnimationInProgress.current = true;
        animateEmojisFalling(stuckEmojis);
        setTimeout(() => {
          shakeAnimationInProgress.current = false;
        }, 1200);
      }
    };

    socket.on('emojis:shake', handleShake);
    socket.on('emojis:reset', handleResetEmojis);
    return () => {
      socket.off('emojis:shake', handleShake);
      socket.off('emojis:reset', handleResetEmojis);
    };
  }, [socket, user.id]);

  // Обработка пасхалки
  useEffect(() => {
    if (isCurrentUser && user.vote === 0.1 && easterEggState) {
      setCurrentEasterEggState(easterEggState);
      
      const refs = {
        cardInnerRef,
        cardContainerRef,
        animationFrameRef,
        animationStartTimeRef,
        easterEggAnimationFrameRef,
        shardsRef
      };

      const timeout = handleEasterEgg(easterEggState, clickCount, refs, {
        setCurrentEasterEggState,
        resetEasterEggAnimation,
        startTiltAnimation,
        startFallingAnimation,
        startShatterAnimation
      });

      return () => {
        if (timeout) clearTimeout(timeout);
      };
    } else if (easterEggState === 'reset') {
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

  // Очистка анимаций при размонтировании
  useEffect(() => {
    return () => {
      cleanupAnimations(animationFrameRef, easterEggAnimationFrameRef, shardsRef);
    };
  }, []);

  // Инициализируем lastAnimationStateRef при монтировании
  useEffect(() => {
    lastAnimationStateRef.current = { isRevealed, vote: user.vote };
  }, []);

  // Единый эффект для анимации
  useEffect(() => {
    if (!user.isOnline || isAnimatingRef.current) return;

    const lastState = lastAnimationStateRef.current;
    const shouldAnimate = lastState.isRevealed !== isRevealed || lastState.vote !== user.vote;

    if (!shouldAnimate) return;

    const refs = {
      cardInnerRef,
      cardContainerRef,
      animationFrameRef,
      animationStartTimeRef,
      easterEggAnimationFrameRef,
      shardsRef
    };

    const startFlipWithAnimation = (type: 'reveal' | 'reset') => {
      isAnimatingRef.current = true;

      // Если есть прилипшие эмодзи, запускаем их падение при любом перевороте
      if (cardContainerRef.current) {
        const stuckEmojis = cardContainerRef.current.querySelectorAll('.stuck-emoji');
        if (stuckEmojis?.length) {
          if (type === 'reset' && socket) {
            socket.emit('emojis:reset');
          }
          animateEmojisFalling(stuckEmojis);
        }
      }

      // Запускаем анимацию элементов
      animateElements(badgesRef, buttonRef, animationFrameRef, animationStartTimeRef);

      // Запускаем анимацию переворота карточки
      startFlipAnimation(type, refs, () => {
        isAnimatingRef.current = false;
        lastAnimationStateRef.current = { isRevealed, vote: user.vote };
      });
    };

    // Определяем тип анимации
    if (!lastState?.isRevealed && isRevealed && hasVoted) {
      // Открытие карт
      startFlipWithAnimation('reveal');
    } else if (lastState?.isRevealed && !isRevealed) {
      // Сброс карт
      startFlipWithAnimation('reset');
    } else if (isRevealed && lastState?.vote === null && user.vote !== null) {
      // Изменение голоса после раскрытия
      user.changedVoteAfterReveal = true;
      startFlipWithAnimation('reveal');
      onVoteAfterReveal?.();
    }
  }, [isRevealed, user.vote, user.isOnline, hasVoted, onVoteAfterReveal]);

  const getCardStyles = () => ({
    transformOrigin: 'center center',
    transform: 'rotateY(0deg)',
    transformStyle: 'preserve-3d' as const,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const
  });

  const getFrontStyles = () => ({
    transform: 'rotateY(0deg)',
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    position: 'absolute' as const,
    width: '100%',
    height: '100%'
  });

  const getBackStyles = () => ({
    transform: 'rotateY(180deg)',
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    position: 'absolute' as const,
    width: '100%',
    height: '100%'
  });
  
  return (
    <div 
      ref={cardContainerRef}
      data-user-id={user.id}
      className="card-container relative h-[140px] sm:h-[160px] select-none"
      onClick={() => {
        if (!isCurrentUser && user.isOnline && !isAnimatingRef.current) {
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
        <div ref={buttonRef} className="absolute left-0 bottom-0">
          <ShakeButton onClick={(e) => {
            e.stopPropagation();
            handleShakeEmojis();
          }} />
        </div>
      )}

      {/* Бейджики с эмодзи */}
      <div ref={badgesRef}>
        <EmojiCounters 
          emojiCounts={emojiCounts}
          isFloating={false}
        />
      </div>
      
      {/* Контейнер для 3D-вращения */}
      <div 
        ref={cardInnerRef}
        className="card-inner w-full h-full relative" 
        style={getCardStyles()}
      >
        <CardFront 
          user={user}
          isCurrentUser={isCurrentUser}
          hasVoted={hasVoted}
          isRevealed={isRevealed}
          style={getFrontStyles()}
        />
        <CardBack 
          user={user}
          isCurrentUser={isCurrentUser}
          hasVoted={hasVoted}
          voteDisplay={voteDisplay}
          style={getBackStyles()}
        />
      </div>
    </div>
  );
} 