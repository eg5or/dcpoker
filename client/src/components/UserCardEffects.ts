import { MutableRefObject } from 'react';
import { AnimationRefs } from './UserCardAnimations';
import { User } from './UserCardTypes';

// Функция для анимации падения эмодзи
export const animateEmojisFalling = (stuckEmojis: NodeListOf<Element>) => {
  stuckEmojis.forEach((emoji, index) => {
    // Сохраняем текущий угол поворота
    const currentTransform = window.getComputedStyle(emoji).transform;
    const currentRotation = currentTransform.includes('rotate') 
      ? parseFloat(currentTransform.split('rotate(')[1]) 
      : 0;
    
    // Добавляем небольшую задержку для каждого следующего эмодзи
    setTimeout(() => {
      const emojiEl = emoji as HTMLElement;
      const startTime = performance.now();
      const duration = 1200; // Увеличиваем длительность
      const startY = emojiEl.offsetTop;
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Используем более плавную кривую для падения
        const eased = 1 - Math.pow(1 - progress, 4); // Более плавное ускорение
        
        const yOffset = eased * 1000; // Падение на 1000px вниз
        const rotation = currentRotation + progress * 360; // Линейное вращение
        const opacity = Math.max(0, 1 - Math.pow(progress, 2)); // Более плавное исчезновение
        
        emojiEl.style.transform = `translateY(${startY + yOffset}px) rotate(${rotation}deg)`;
        emojiEl.style.opacity = opacity.toString();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else if (emojiEl.parentNode) {
          emojiEl.parentNode.removeChild(emojiEl);
        }
      };
      
      requestAnimationFrame(animate);
    }, index * 80); // Увеличиваем задержку между эмодзи
  });
};

// Функция для обработки пасхалки
export const handleEasterEgg = (
  easterEggState: string,
  clickCount: number,
  refs: AnimationRefs,
  callbacks: {
    setCurrentEasterEggState: (state: string | undefined) => void;
    resetEasterEggAnimation: (refs: AnimationRefs) => void;
    startTiltAnimation: (clickCount: number, refs: AnimationRefs) => void;
    startFallingAnimation: (refs: AnimationRefs) => void;
    startShatterAnimation: (refs: AnimationRefs) => void;
  }
) => {
  const { setCurrentEasterEggState, resetEasterEggAnimation, startTiltAnimation, startFallingAnimation, startShatterAnimation } = callbacks;

  if (easterEggState === 'tilt') {
    startTiltAnimation(clickCount, refs);
  } else if (easterEggState === 'fall') {
    startFallingAnimation(refs);
    return setTimeout(() => {
      setCurrentEasterEggState('shatter');
    }, 1500);
  } else if (easterEggState === 'shatter') {
    startShatterAnimation(refs);
    return setTimeout(() => {
      resetEasterEggAnimation(refs);
      setCurrentEasterEggState(undefined);
    }, 3000);
  }
};

// Функция для очистки анимаций
export const cleanupAnimations = (
  animationFrameRef: MutableRefObject<number | null>,
  easterEggAnimationFrameRef: MutableRefObject<number | null>,
  shardsRef: MutableRefObject<HTMLDivElement[]>
) => {
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

// Функция для обработки анимации карточки
export const handleCardAnimation = (
  params: {
    isRevealed: boolean;
    prevRevealState: boolean;
    prevVoteState: number | null;
    user: User;
    hasVoted: boolean;
    cardContainerRef: MutableRefObject<HTMLDivElement | null>;
  },
  refs: AnimationRefs,
  callbacks: {
    setIsFlipping: (value: boolean) => void;
    setIsAnimatingManually: (value: boolean) => void;
    startFlipAnimation: (type: 'reveal' | 'reset') => void;
    onVoteAfterReveal?: () => void;
  }
) => {
  const { isRevealed, prevRevealState, prevVoteState, user, hasVoted, cardContainerRef } = params;
  const { setIsFlipping, setIsAnimatingManually, startFlipAnimation, onVoteAfterReveal } = callbacks;

  // Если карточка уже в процессе анимации, не начинаем новую
  if (!cardContainerRef.current) return;

  const handleFlip = (type: 'reveal' | 'reset') => {
    // Если нет голоса, не делаем анимацию
    if (!hasVoted) return;

    const stuckEmojis = cardContainerRef.current?.querySelectorAll('.stuck-emoji');
    if (stuckEmojis?.length) {
      animateEmojisFalling(stuckEmojis);
      setTimeout(() => startFlipAnimation(type), 100);
    } else {
      startFlipAnimation(type);
    }
  };

  // Обработка сброса карт (приоритет 1)
  if (prevRevealState && !isRevealed) {
    handleFlip('reset');
    return;
  }

  // Обработка изменения голоса после раскрытия (приоритет 2)
  if (isRevealed && prevRevealState && prevVoteState === null && user.vote !== null) {
    user.changedVoteAfterReveal = true;
    handleFlip('reveal');
    onVoteAfterReveal?.();
    return;
  }

  // Обработка раскрытия карт (приоритет 3)
  if (!prevRevealState && isRevealed) {
    handleFlip('reveal');
    return;
  }
}; 