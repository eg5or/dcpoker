import { MutableRefObject } from 'react';

export interface AnimationRefs {
  cardInnerRef: MutableRefObject<HTMLDivElement | null>;
  cardContainerRef: MutableRefObject<HTMLDivElement | null>;
  animationFrameRef: MutableRefObject<number | null>;
  animationStartTimeRef: MutableRefObject<number | null>;
  easterEggAnimationFrameRef: MutableRefObject<number | null>;
  shardsRef: MutableRefObject<HTMLDivElement[]>;
}

export const createShards = (cardRect: DOMRect, refs: AnimationRefs) => {
  // Очищаем старые осколки
  if (refs.shardsRef.current) {
    refs.shardsRef.current.forEach(shard => {
      if (shard.parentNode) {
        shard.parentNode.removeChild(shard);
      }
    });
  }
  
  const shards: HTMLDivElement[] = [];
  refs.shardsRef.current = shards;
  
  const numShards = 20;
  const container = refs.cardContainerRef.current;
  if (!container) return;
  
  for (let i = 0; i < numShards; i++) {
    const shard = document.createElement('div');
    shard.className = 'shard';
    
    // Позиционируем осколки в месте карточки
    shard.style.left = `${cardRect.left + cardRect.width / 2}px`;
    shard.style.top = `${cardRect.top + cardRect.height / 2}px`;
    
    // Случайный размер для каждого осколка
    const size = 10 + Math.random() * 30;
    shard.style.width = `${size}px`;
    shard.style.height = `${size}px`;
    
    // Добавляем градиент и тень для более реалистичного вида
    const hue = 200 + Math.random() * 20; // Синеватый оттенок
    shard.style.backgroundColor = `hsl(${hue}, 30%, 20%)`;
    shard.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    
    document.body.appendChild(shard);
    shards.push(shard);
    
    // Анимируем каждый осколок
    const angle = (i / numShards) * Math.PI * 2 + Math.random() * 0.5;
    const velocity = 5 + Math.random() * 10;
    const rotationSpeed = (Math.random() - 0.5) * 720;
    
    let startTime: number | null = null;
    const duration = 1000 + Math.random() * 500;
    
    const animateShard = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Параболическая траектория
      const x = Math.cos(angle) * velocity * progress * 100;
      const y = Math.sin(angle) * velocity * progress * 100 + 
                progress * progress * 500; // Ускорение падения
      
      const rotation = rotationSpeed * progress;
      const scale = 1 - progress * 0.5;
      
      shard.style.transform = `
        translate(${x}px, ${y}px) 
        rotate(${rotation}deg) 
        scale(${scale})
      `;
      
      // Плавное исчезновение
      shard.style.opacity = `${1 - progress}`;
      
      if (progress < 1) {
        requestAnimationFrame(animateShard);
      } else if (shard.parentNode) {
        shard.parentNode.removeChild(shard);
      }
    };
    
    requestAnimationFrame(animateShard);
  }
};

export const startTiltAnimation = (
  clickCount: number,
  refs: AnimationRefs
) => {
  if (!refs.cardContainerRef.current) return;
  
  // Отменяем предыдущую анимацию
  if (refs.easterEggAnimationFrameRef.current) {
    cancelAnimationFrame(refs.easterEggAnimationFrameRef.current);
  }
  
  const container = refs.cardContainerRef.current;
  let startTime: number | null = null;
  const duration = 1000;
  
  // Рассчитываем угол наклона в зависимости от количества кликов
  // С 4 по 8 клик увеличиваем наклон
  const baseAngle = -10; // Начальный угол наклона
  const clicksAfterThreshold = Math.min(Math.max(clickCount - 3, 0), 5); // От 0 до 5
  const maxTiltAngle = -50; // Максимальный угол наклона
  const targetAngle = baseAngle - (clicksAfterThreshold * ((Math.abs(maxTiltAngle) - Math.abs(baseAngle)) / 5));
  
  const animateTilt = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Функция плавности
    const easeOutElastic = (t: number) => {
      const p = 0.3;
      return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
    const easedProgress = easeOutElastic(progress);
    
    // Наклон с эффектом пружины
    const angle = targetAngle * easedProgress;
    const translateY = 5 * easedProgress; // Небольшое смещение вниз
    
    container.style.transform = `rotateZ(${angle}deg) translateY(${translateY}px)`;
    
    if (progress < 1) {
      refs.easterEggAnimationFrameRef.current = requestAnimationFrame(animateTilt);
    }
  };
  
  refs.easterEggAnimationFrameRef.current = requestAnimationFrame(animateTilt);
};

export const startFallingAnimation = (refs: AnimationRefs) => {
  if (!refs.cardContainerRef.current) return;
  
  if (refs.easterEggAnimationFrameRef.current) {
    cancelAnimationFrame(refs.easterEggAnimationFrameRef.current);
  }
  
  const container = refs.cardContainerRef.current;
  const windowHeight = window.innerHeight;
  const cardRect = container.getBoundingClientRect();
  const fallDistance = windowHeight - cardRect.top + 100;
  
  let startTime: number | null = null;
  const duration = 1500;
  
  // Запоминаем начальный наклон (последний угол из анимации наклона)
  const initialAngle = -50;
  const initialTranslateY = 5;
  
  const animateFall = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Функция ускорения падения
    const fallEase = (t: number) => {
      return t < 0.5 
        ? 2 * t * t 
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };
    
    // Добавляем небольшое колебание при падении
    const wobble = Math.sin(progress * Math.PI * 4) * (1 - progress) * 10;
    
    // Рассчитываем текущие значения трансформации
    const fallProgress = fallEase(progress);
    const translateY = initialTranslateY + fallDistance * fallProgress;
    const rotateZ = initialAngle - 40 * fallProgress + wobble;
    
    // Добавляем небольшое смещение влево при падении
    const translateX = -50 * fallProgress;
    
    container.style.transform = `
      translateY(${translateY}px) 
      translateX(${translateX}px) 
      rotateZ(${rotateZ}deg)
    `;
    
    // Уменьшаем прозрачность ближе к концу падения
    if (progress > 0.8) {
      const opacity = 1 - ((progress - 0.8) * 5);
      container.style.opacity = opacity.toString();
    }
    
    if (progress < 1) {
      refs.easterEggAnimationFrameRef.current = requestAnimationFrame(animateFall);
    } else {
      // После завершения падения запускаем анимацию разлетания
      startShatterAnimation(refs);
    }
  };
  
  refs.easterEggAnimationFrameRef.current = requestAnimationFrame(animateFall);
};

export const startShatterAnimation = (refs: AnimationRefs) => {
  if (!refs.cardContainerRef.current) return;
  
  if (refs.easterEggAnimationFrameRef.current) {
    cancelAnimationFrame(refs.easterEggAnimationFrameRef.current);
  }
  
  const container = refs.cardContainerRef.current;
  
  // Создаем осколки сразу в конечной позиции карточки
  const cardRect = container.getBoundingClientRect();
  createShards(cardRect, refs);
  
  // Скрываем оригинальную карточку
  container.style.visibility = 'hidden';
};

export const resetEasterEggAnimation = (refs: AnimationRefs) => {
  if (!refs.cardContainerRef.current) return;
  
  // Отменяем анимации
  if (refs.easterEggAnimationFrameRef.current) {
    cancelAnimationFrame(refs.easterEggAnimationFrameRef.current);
    refs.easterEggAnimationFrameRef.current = null;
  }
  
  // Очищаем осколки
  refs.shardsRef.current.forEach(shard => {
    if (shard.parentNode) {
      shard.parentNode.removeChild(shard);
    }
  });
  refs.shardsRef.current = [];
  
  // Сбрасываем стили
  const container = refs.cardContainerRef.current;
  container.style.transform = '';
  container.style.opacity = '';
  container.style.filter = '';
  container.style.visibility = '';
};

export function startFlipAnimation(
  type: 'reveal' | 'reset',
  refs: AnimationRefs,
  onComplete?: () => void
) {
  if (!refs.cardInnerRef.current) return;

  const startTime = performance.now();
  const duration = 1500; // 1.5 seconds
  const cardInner = refs.cardInnerRef.current;
  const cardFront = cardInner.querySelector('.card-front') as HTMLDivElement;
  const cardBack = cardInner.querySelector('.card-back') as HTMLDivElement;

  if (!cardFront || !cardBack) return;

  // Устанавливаем начальное положение
  if (type === 'reveal') {
    cardInner.style.transform = 'rotateY(0deg)';
    cardFront.style.transform = 'rotateY(0deg)';
    cardBack.style.transform = 'rotateY(180deg)';
  } else {
    cardInner.style.transform = 'rotateY(180deg)';
    cardFront.style.transform = 'rotateY(0deg)';
    cardBack.style.transform = 'rotateY(180deg)';
  }

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Используем easeInOutCubic для плавности
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    const angle = type === 'reveal' ? eased * 180 : (1 - eased) * 180;
    
    // Анимируем карточку
    cardInner.style.transform = `rotateY(${angle}deg)`;

    if (progress < 1) {
      refs.animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      refs.animationFrameRef.current = null;
      onComplete?.();
    }
  };

  refs.animationFrameRef.current = requestAnimationFrame(animate);
}

// Функция для анимации элементов при перевороте карточки
export const animateElements = (
  badgesRef: MutableRefObject<HTMLDivElement | null>,
  buttonRef: MutableRefObject<HTMLDivElement | null>,
  animationFrameRef: MutableRefObject<number | null>,
  animationStartTimeRef: MutableRefObject<number | null>,
  onComplete?: () => void
) => {
  if (!badgesRef.current && !buttonRef.current) return;

  // Сбрасываем значения
  animationStartTimeRef.current = null;

  // Находим все прилипшие эмодзи на карточке
  const cardContainer = buttonRef.current?.closest('.card-container');
  const stuckEmojis = cardContainer?.querySelectorAll('.stuck-emoji');

  // Запускаем анимацию падения для эмодзи
  if (stuckEmojis?.length) {
    stuckEmojis.forEach(emoji => {
      const initialRotation = Math.random() * 360; // Случайный начальный угол
      (emoji as HTMLElement).style.setProperty('--initial-rotation', `${initialRotation}deg`);
      (emoji as HTMLElement).style.transition = 'none';
      (emoji as HTMLElement).classList.add('falling');
    });
  }

  const animate = (timestamp: number) => {
    // Инициализируем время начала анимации
    if (!animationStartTimeRef.current) {
      animationStartTimeRef.current = timestamp;
    }

    // Вычисляем прогресс анимации (0 to 1)
    const elapsed = timestamp - animationStartTimeRef.current;
    const duration = 800; // Синхронизируем с длительностью переворота карточки
    let progress = Math.min(elapsed / duration, 1);

    // Функция для плавности анимации
    const easeInOut = (x: number): number => {
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    };

    progress = easeInOut(progress);

    // Анимация для бейджиков (движение вверх и за карточку)
    if (badgesRef.current) {
      const translateY = -60 * progress; // Движение вверх
      const translateZ = -100 * progress; // Движение за карточку
      const opacity = Math.max(0, 1 - progress * 2); // Плавное исчезновение в первой половине анимации

      badgesRef.current.style.transform = `translate3d(0, ${translateY}px, ${translateZ}px)`;
      badgesRef.current.style.opacity = opacity.toString();
    }

    // Анимация для кнопки (движение вниз и за карточку)
    if (buttonRef.current) {
      const translateY = 60 * progress; // Движение вниз
      const translateZ = -100 * progress; // Движение за карточку
      const opacity = Math.max(0, 1 - progress * 2); // Плавное исчезновение в первой половине анимации

      buttonRef.current.style.transform = `translate3d(0, ${translateY}px, ${translateZ}px)`;
      buttonRef.current.style.opacity = opacity.toString();
    }

    // Продолжаем анимацию, если она не завершена
    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Завершаем анимацию
      if (badgesRef.current) {
        badgesRef.current.style.visibility = 'hidden';
      }
      if (buttonRef.current) {
        buttonRef.current.style.visibility = 'hidden';
      }

      // Удаляем упавшие эмодзи
      if (stuckEmojis?.length) {
        setTimeout(() => {
          stuckEmojis.forEach(emoji => {
            if (emoji.parentNode) {
              emoji.parentNode.removeChild(emoji);
            }
          });
        }, 1000); // Ждем завершения анимации падения
      }

      animationStartTimeRef.current = null;
      animationFrameRef.current = null;

      // Запускаем возвращение элементов через 400мс (половина времени переворота)
      setTimeout(() => {
        if (badgesRef.current) {
          badgesRef.current.style.transition = 'all 0.4s ease';
          badgesRef.current.style.visibility = 'visible';
          badgesRef.current.style.transform = '';
          badgesRef.current.style.opacity = '';
        }
        if (buttonRef.current) {
          buttonRef.current.style.transition = 'all 0.4s ease';
          buttonRef.current.style.visibility = 'visible';
          buttonRef.current.style.transform = '';
          buttonRef.current.style.opacity = '';
        }

        // Убираем transition после анимации
        setTimeout(() => {
          if (badgesRef.current) {
            badgesRef.current.style.transition = '';
          }
          if (buttonRef.current) {
            buttonRef.current.style.transition = '';
          }
          onComplete?.();
        }, 400);
      }, 400);
    }
  };

  // Запускаем анимацию
  if (badgesRef.current) {
    badgesRef.current.style.transition = 'none';
  }
  if (buttonRef.current) {
    buttonRef.current.style.transition = 'none';
  }

  animationFrameRef.current = requestAnimationFrame(animate);
}; 