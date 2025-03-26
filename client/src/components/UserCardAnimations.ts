import { MutableRefObject } from 'react';
import { FlipAnimationType } from './UserCardTypes';

interface AnimationRefs {
  cardInnerRef: React.RefObject<HTMLDivElement>;
  cardContainerRef: React.RefObject<HTMLDivElement>;
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

export const startFlipAnimation = (
  type: FlipAnimationType,
  refs: AnimationRefs,
  onComplete: () => void
) => {
  if (!refs.cardInnerRef.current) return;
  
  // Сбрасываем значения
  refs.animationStartTimeRef.current = null;
  
  const flipCard = (timestamp: number) => {
    if (!refs.cardInnerRef.current) return;
    
    // Инициализируем время начала анимации
    if (!refs.animationStartTimeRef.current) {
      refs.animationStartTimeRef.current = timestamp;
    }
    
    // Вычисляем прогресс анимации (0 to 1)
    const elapsed = timestamp - refs.animationStartTimeRef.current;
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
    refs.cardInnerRef.current.style.transform = `
      rotateY(${rotateY}deg) 
      scale(${scale}) 
      translateZ(${elevation}px)
    `;
    
    // Интенсивность тени в зависимости от прогресса
    const shadowIntensity = Math.sin(progress * Math.PI) * 30 + 10;
    refs.cardInnerRef.current.style.boxShadow = `0 ${shadowIntensity}px ${shadowIntensity * 2}px rgba(0, 0, 0, 0.3)`;
    
    // Продолжаем анимацию, если она не завершена
    if (progress < 1) {
      refs.animationFrameRef.current = requestAnimationFrame(flipCard);
    } else {
      // Завершаем анимацию
      refs.cardInnerRef.current.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
      
      // Устанавливаем конечное состояние в зависимости от типа анимации
      if (type === 'reveal') {
        refs.cardInnerRef.current.style.transform = 'rotateY(180deg)';
      } else {
        refs.cardInnerRef.current.style.transform = 'rotateY(0deg)';
      }
      
      refs.cardInnerRef.current.style.boxShadow = '';
      
      onComplete();
      
      refs.animationStartTimeRef.current = null;
      refs.animationFrameRef.current = null;
    }
  };
  
  // Устанавливаем начальное состояние
  refs.cardInnerRef.current.style.transition = 'none';
  
  // Запускаем анимацию
  refs.animationFrameRef.current = requestAnimationFrame(flipCard);
}; 