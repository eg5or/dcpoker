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
  joinedAt?: number; // timestamp последнего посещения
}

interface UserCardProps {
  user: User;
  isRevealed: boolean;
  currentUserId: string | undefined;
  onThrowEmoji: (targetId: string, emoji: string) => void;
  selectedEmoji: string;
  easterEggState?: 'tilt' | 'fall' | 'shatter' | 'reset';
  onVoteAfterReveal?: () => void;
}

// Функция для форматирования относительного времени
const getRelativeTimeString = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} ${getMinutesForm(minutes)} назад`;
  if (hours < 24) return `${hours} ${getHoursForm(hours)} назад`;
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${getDaysForm(days)} назад`;
  
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  });
};

// Вспомогательные функции для правильных окончаний
const getMinutesForm = (minutes: number): string => {
  if (minutes >= 11 && minutes <= 14) return 'минут';
  const lastDigit = minutes % 10;
  if (lastDigit === 1) return 'минуту';
  if (lastDigit >= 2 && lastDigit <= 4) return 'минуты';
  return 'минут';
};

const getHoursForm = (hours: number): string => {
  if (hours >= 11 && hours <= 14) return 'часов';
  const lastDigit = hours % 10;
  if (lastDigit === 1) return 'час';
  if (lastDigit >= 2 && lastDigit <= 4) return 'часа';
  return 'часов';
};

const getDaysForm = (days: number): string => {
  if (days >= 11 && days <= 14) return 'дней';
  const lastDigit = days % 10;
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
};

export function UserCard({ 
  user, 
  isRevealed, 
  currentUserId, 
  onThrowEmoji, 
  selectedEmoji,
  easterEggState,
  onVoteAfterReveal
}: UserCardProps) {
  const isCurrentUser = user.id === currentUserId;
  const [isFlipping, setIsFlipping] = useState(false);
  const [prevRevealState, setPrevRevealState] = useState<boolean>(isRevealed);
  const [prevVoteState, setPrevVoteState] = useState<number | null>(user.vote);
  const [badgesFloating, setBadgesFloating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const easterEggAnimationFrameRef = useRef<number | null>(null);
  const [isAnimatingManually, setIsAnimatingManually] = useState(false);
  const [currentEasterEggState, setCurrentEasterEggState] = useState<string | undefined>(undefined);
  const shardsRef = useRef<HTMLDivElement[]>([]);

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

  // Эффект разлетающихся осколков
  const createShards = (cardRect: DOMRect) => {
    // Очищаем старые осколки
    shardsRef.current.forEach(shard => {
      if (shard.parentNode) {
        shard.parentNode.removeChild(shard);
      }
    });
    shardsRef.current = [];
    
    const numShards = 20;
    const container = cardContainerRef.current;
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
      shardsRef.current.push(shard);
      
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

  // Модифицируем анимацию наклона
  const startTiltAnimation = () => {
    if (!cardContainerRef.current) return;
    
    // Отменяем предыдущую анимацию
    if (easterEggAnimationFrameRef.current) {
      cancelAnimationFrame(easterEggAnimationFrameRef.current);
    }
    
    const container = cardContainerRef.current;
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
        easterEggAnimationFrameRef.current = requestAnimationFrame(animateTilt);
      }
    };
    
    easterEggAnimationFrameRef.current = requestAnimationFrame(animateTilt);
  };
  
  // Модифицируем анимацию падения
  const startFallingAnimation = () => {
    if (!cardContainerRef.current) return;
    
    if (easterEggAnimationFrameRef.current) {
      cancelAnimationFrame(easterEggAnimationFrameRef.current);
    }
    
    const container = cardContainerRef.current;
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
        easterEggAnimationFrameRef.current = requestAnimationFrame(animateFall);
      } else {
        // После завершения падения запускаем анимацию разлетания
        startShatterAnimation();
      }
    };
    
    easterEggAnimationFrameRef.current = requestAnimationFrame(animateFall);
  };
  
  // Модифицируем анимацию разлетания
  const startShatterAnimation = () => {
    if (!cardContainerRef.current) return;
    
    if (easterEggAnimationFrameRef.current) {
      cancelAnimationFrame(easterEggAnimationFrameRef.current);
    }
    
    const container = cardContainerRef.current;
    
    // Создаем осколки сразу в конечной позиции карточки
    const cardRect = container.getBoundingClientRect();
    createShards(cardRect);
    
    // Скрываем оригинальную карточку
    container.style.visibility = 'hidden';
  };

  // Сброс всех анимаций пасхалки
  const resetEasterEggAnimation = () => {
    if (!cardContainerRef.current) return;
    
    // Отменяем анимации
    if (easterEggAnimationFrameRef.current) {
      cancelAnimationFrame(easterEggAnimationFrameRef.current);
      easterEggAnimationFrameRef.current = null;
    }
    
    // Очищаем осколки
    shardsRef.current.forEach(shard => {
      if (shard.parentNode) {
        shard.parentNode.removeChild(shard);
      }
    });
    shardsRef.current = [];
    
    // Сбрасываем стили
    const container = cardContainerRef.current;
    container.style.transform = '';
    container.style.opacity = '';
    container.style.filter = '';
    container.style.visibility = '';
    
    setCurrentEasterEggState(undefined);
  };

  // Обработка пасхалки
  useEffect(() => {
    if (isCurrentUser && user.vote === 0.1 && easterEggState) {
      // Если пасхалка активирована для текущего пользователя и он выбрал кофе
      setCurrentEasterEggState(easterEggState);
      
      // Запускаем соответствующую анимацию
      if (easterEggState === 'tilt') {
        startTiltAnimation();
      } else if (easterEggState === 'fall') {
        startFallingAnimation();
        
        // Автоматический переход к разбитию через время
        const timeout = setTimeout(() => {
          setCurrentEasterEggState('shatter');
        }, 1500);
        return () => clearTimeout(timeout);
      } else if (easterEggState === 'shatter') {
        startShatterAnimation();
        
        // Сброс состояния через время
        const timeout = setTimeout(() => {
          resetEasterEggAnimation();
        }, 3000);
        return () => clearTimeout(timeout);
      }
    } else if (easterEggState === 'reset') {
      // Сбрасываем пасхалку
      resetEasterEggAnimation();
    }
  }, [easterEggState, isCurrentUser, user.vote]);

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

  // Эффект для отслеживания изменений состояния вскрытия и голоса
  useEffect(() => {
    // Если анимация уже идет, не запускаем новую
    if (isFlipping) return;
    
    // Проверяем, что пользователь онлайн, иначе не переворачиваем его карточку
    if (!user.isOnline) return;

    // Проверяем, не проголосовал ли пользователь после раскрытия карт
    if (isRevealed && prevVoteState === null && user.vote !== null) {
      // Помечаем что голос был изменен после раскрытия
      user.changedVoteAfterReveal = true;
      startFlipAnimation('reveal');
      // Вызываем callback для показа баннера
      onVoteAfterReveal?.();
    }
    // Если карты только что вскрыли
    else if (!prevRevealState && isRevealed) {
      // Переворачиваем только если есть голос
      if (hasVoted) {
        startFlipAnimation('reveal');
      }
    }
    // Если карты сбросили 
    else if (prevRevealState && !isRevealed && hasVoted) {
      // При сбросе переворачиваем только карты, которые были с голосом
      startFlipAnimation('reset');
    }

    // Сохраняем текущее состояние для следующего сравнения
    setPrevRevealState(isRevealed);
    setPrevVoteState(user.vote);
  }, [isRevealed, user.vote, prevRevealState, prevVoteState, isCurrentUser, isFlipping, user.isOnline, hasVoted, onVoteAfterReveal]);

  const startFlipAnimation = (type: 'reveal' | 'reset') => {
    if (!cardInnerRef.current) return;
    
    // Отмечаем, что анимация началась
    setIsFlipping(true);
    setIsAnimatingManually(true);
    
    // Запускаем анимацию бейджиков только если они есть
    if (totalAttacks > 0) {
      setBadgesFloating(true);
      // Увеличиваем время анимации бейджиков, чтобы они дольше оставались наверху
      setTimeout(() => setBadgesFloating(false), 1500);
    }
    
    // Сбрасываем значения
    animationStartTimeRef.current = null;
    
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
          onThrowEmoji(user.id, selectedEmoji);
        } else if (isCurrentUser && user.vote === 0.1) {
          setClickCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 4 && newCount < 9) {
              startTiltAnimation();
            } else if (newCount === 9) {
              startFallingAnimation();
            }
            return newCount;
          });
        }
      }}
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
        style={getCardStyles()}
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
      </div>
    </div>
  );
} 