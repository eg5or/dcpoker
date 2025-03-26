import { MutableRefObject } from 'react';
import { AnimationRefs } from './UserCardAnimations';
import { User } from './UserCardTypes';

// Функция для анимации падения эмодзи
export const animateEmojisFalling = (emojis: NodeListOf<Element>, shakeIntensity?: 'random' | 'all') => {
  // Конвертируем NodeList в массив для удобства работы
  const emojiArray = Array.from(emojis);
  
  console.log(`[Shake] Total emojis before filtering: ${emojiArray.length}`);
  
  // Перемешиваем массив перед фильтрацией
  const shuffledArray = emojiArray.sort(() => Math.random() - 0.5);
  
  // Если shakeIntensity = 'random', то часть эмодзи может остаться
  // Если shakeIntensity = 'all' или не указан, все эмодзи отваливаются
  const shuffledEmojis = shakeIntensity === 'random' 
    ? shuffledArray.filter(() => {
        // Базовый шанс 70% + случайный бонус до 25%
        const baseChance = 0.7;
        const randomBonus = Math.random() * 0.25;
        const totalChance = baseChance + randomBonus;
        const willFall = Math.random() < totalChance;
        
        console.log(`[Shake] Emoji fall chance: ${(totalChance * 100).toFixed(1)}%, Will fall: ${willFall}`);
        return willFall;
      })
    : shuffledArray;
  
  console.log(`[Shake] Emojis that will fall: ${shuffledEmojis.length}`);
  
  let currentIndex = 0;
  let lastStartTime = 0;
  
  // Функция для анимации одного эмодзи
  const animateEmoji = (emoji: Element, startTime: number) => {
    const element = emoji as HTMLElement;
    const rect = element.getBoundingClientRect();
    const startY = rect.top;
    
    // Получаем текущую трансформацию
    const currentTransform = element.style.transform;
    const currentRotation = currentTransform 
      ? parseInt(currentTransform.split('rotate(')[1]) || 0 
      : 0;
    
    const duration = 800;
    const fallDistance = window.innerHeight - startY + 100;
    
    // Случайные параметры для эмодзи
    const randomX = (Math.random() - 0.5) * 30; // ±15px
    const rotationSpeed = (Math.random() - 0.5) * 360; // ±180 градусов
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Квадратичная функция для имитации ускорения падения
      const fallProgress = Math.pow(progress, 2);
      const translateY = fallDistance * fallProgress;
      
      // Линейное движение по X и вращение
      const translateX = randomX * progress;
      const rotation = currentRotation + (rotationSpeed * progress);
      
      element.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`;
      
      // Плавное исчезновение в конце
      if (progress > 0.7) {
        element.style.opacity = (1 - ((progress - 0.7) / 0.3)).toString();
      }
      
      if (progress < 1) {
        requestAnimationFrame((time) => animate(time));
      } else {
        element.remove();
      }
    };
    
    requestAnimationFrame((time) => animate(time));
  };

  // Функция для запуска следующей анимации
  const startNextAnimation = (currentTime: number) => {
    // Запускаем следующую анимацию каждые 16.67мс (1 фрейм при 60fps)
    if (currentTime - lastStartTime >= 16.67 || currentIndex === 0) {
      if (currentIndex < shuffledEmojis.length) {
        animateEmoji(shuffledEmojis[currentIndex], currentTime);
        lastStartTime = currentTime;
        currentIndex++;
        requestAnimationFrame(startNextAnimation);
      }
    } else {
      requestAnimationFrame(startNextAnimation);
    }
  };

  // Начинаем цепочку анимаций
  requestAnimationFrame(startNextAnimation);
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
  callbacks: {
    setIsFlipping: (value: boolean) => void;
    setIsAnimatingManually: (value: boolean) => void;
    startFlipAnimation: (type: 'reveal' | 'reset') => void;
    onVoteAfterReveal?: () => void;
  }
) => {
  const { isRevealed, prevRevealState, prevVoteState, user, hasVoted, cardContainerRef } = params;
  const { startFlipAnimation, onVoteAfterReveal } = callbacks;

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