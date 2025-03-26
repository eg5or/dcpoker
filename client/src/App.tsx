import { useCallback, useEffect, useRef, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { LoginForm } from './components/LoginForm';
import { animateEmojisFalling } from './components/UserCardEffects';
import { useSocket } from './hooks/useSocket';
import type { GameState } from './types';
import { FIBONACCI_SEQUENCE } from './types';

interface EmojiThrowData {
  targetId: string;
  fromId: string;
  emoji: string;
  trajectory: {
    startX: number;
    startY: number;
  };
}

interface EmojiShakeData {
  userId: string;
}

function App() {
  const socket = useSocket();
  const [name, setName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    users: [],
    isRevealed: false,
    averageVote: null,
    usersChangedVoteAfterReveal: [],
    consistency: null
  });
  const isPageVisible = useRef(true);
  const lastResetTime = useRef<number>(0);
  const pendingAnimations = useRef<Array<{
    type: 'throw' | 'shake' | 'fall';
    time: number;
    data: any;
  }>>([]);

  // Функция для обработки отложенных анимаций
  const processPendingAnimations = useCallback(() => {
    if (!isPageVisible.current || pendingAnimations.current.length === 0) return;

    // Сортируем анимации по времени
    pendingAnimations.current.sort((a, b) => a.time - b.time);

    // Проверяем, есть ли сброс среди отложенных анимаций
    const lastReset = pendingAnimations.current
      .filter(anim => anim.type === 'fall')
      .pop();

    if (lastReset) {
      // Если есть сброс, отбрасываем все анимации до него
      pendingAnimations.current = pendingAnimations.current
        .filter(anim => anim.time >= lastReset.time);
    }

    // Проверяем относительно глобального сброса и времени оттряхивания
    pendingAnimations.current = pendingAnimations.current
      .filter(anim => {
        // Всегда пропускаем анимации после глобального сброса
        if (anim.time < lastResetTime.current) return false;

        // Для бросков эмодзи проверяем время оттряхивания цели
        if (anim.type === 'throw') {
          const targetUser = gameState.users.find(u => u.id === anim.data.targetId);
          if (targetUser?.lastShakeTime && anim.time < targetUser.lastShakeTime) {
            return false;
          }
        }

        return true;
      });

    // Выполняем оставшиеся анимации
    pendingAnimations.current.forEach(animation => {
      switch (animation.type) {
        case 'throw':
          handleEmojiThrown(animation.data);
          break;
        case 'shake':
          handleEmojiShake(animation.data);
          break;
        case 'fall':
          handleEmojiFall();
          break;
      }
    });

    // Очищаем очередь
    pendingAnimations.current = [];
  }, [gameState.users]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisible.current = document.visibilityState === 'visible';
      if (isPageVisible.current) {
        processPendingAnimations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [processPendingAnimations]);

  useEffect(() => {
    if (!socket) return;

    socket.on('game:state', (state: GameState & { resetTime?: number }) => {
      console.log('Получено обновление состояния:', state);
      if (state.resetTime) {
        lastResetTime.current = state.resetTime;
      }
      setGameState(state);
      
      const currentUser = state.users.find((u: { id: string }) => u.id === socket.id);
      if (currentUser) {
        setCurrentVote(currentUser.vote);
      }
    });

    socket.on('user:joined', (user) => {
      console.log('Пользователь присоединился:', user);
    });

    socket.on('connect_error', () => {
      setError('Ошибка подключения к серверу');
      setIsConnecting(false);
    });

    socket.on('disconnect', () => {
      setError('Соединение с сервером потеряно');
      setIsJoined(false);
    });

    socket.on('force:logout', () => {
      localStorage.removeItem('userName');
      setName('');
      setIsJoined(false);
      setCurrentVote(null);
    });

    socket.on('emojis:fall', (fallTime: number) => {
      if (!isPageVisible.current) {
        pendingAnimations.current.push({
          type: 'fall',
          time: fallTime,
          data: null
        });
        return;
      }
      handleEmojiFall();
    });

    socket.on('emojis:shake', (userId: string, shakeTime: number) => {
      if (!isPageVisible.current) {
        pendingAnimations.current.push({
          type: 'shake',
          time: shakeTime,
          data: { userId }
        });
        return;
      }
      handleEmojiShake({ userId });
    });

    socket.on('emoji:thrown', (targetId: string, fromId: string, emoji: string, trajectory: any, throwTime: number) => {
      if (!isPageVisible.current) {
        pendingAnimations.current.push({
          type: 'throw',
          time: throwTime,
          data: { targetId, fromId, emoji, trajectory }
        });
        return;
      }
      handleEmojiThrown({ targetId, fromId, emoji, trajectory });
    });

    socket.on('emojis:reset', () => {
      // Ретранслируем событие всем клиентам
      socket.emit('emojis:fall');
    });

    return () => {
      socket.off('game:state');
      socket.off('user:joined');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('force:logout');
      socket.off('emojis:fall');
      socket.off('emojis:reset');
      socket.off('emojis:shake');
      socket.off('emoji:thrown');
    };
  }, [socket, processPendingAnimations]);

  // Выделяем функции обработки анимаций
  const handleEmojiThrown = useCallback(({ targetId, emoji, trajectory }: EmojiThrowData) => {
    // Проверяем, не было ли оттряхивания после броска
    const targetUser = gameState.users.find(u => u.id === targetId);
    if (targetUser?.lastShakeTime && targetUser.lastShakeTime > Date.now()) {
      return; // Пропускаем анимацию, если цель уже оттряхнула эмодзи
    }

    const targetElement = document.querySelector(`[data-user-id="${targetId}"]`);
    if (!targetElement) return;

    const projectile = document.createElement('div');
    projectile.className = 'emoji-projectile';
    projectile.textContent = emoji;
    document.body.appendChild(projectile);

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetRect = targetElement.getBoundingClientRect();
    
    const startX = (trajectory.startX / 100) * windowWidth;
    const startY = (trajectory.startY / 100) * windowHeight;
    
    // Генерируем случайную конечную точку внутри карточки
    const padding = 20; // отступ от краев
    const randomX = Math.random() * (targetRect.width - padding * 2) + padding;
    const randomY = Math.random() * (targetRect.height - padding * 2) + padding;
    
    // Вычисляем абсолютные координаты конечной точки
    const endX = targetRect.left + randomX;
    const endY = targetRect.top + randomY;

    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const maxHeight = distance * 0.3;
    const duration = 1000; // 1 секунда

    let startTime: number | null = null;
    let animationFrameId: number;

    // Генерируем случайный угол поворота заранее
    const randomRotation = Math.random() * 40 - 20; // от -20 до +20 градусов

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Функция плавности для более естественного движения
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      // Используем различные функции для разных параметров
      const moveProgress = progress;
      const rotateProgress = easeOutBack(progress);
      const scaleProgress = Math.sin(progress * Math.PI);

      // Параболическая траектория с более реалистичной физикой
      const x = startX + (endX - startX) * moveProgress;
      const linearY = startY + (endY - startY) * moveProgress;
      const parabolaHeight = Math.sin(moveProgress * Math.PI) * maxHeight;
      const y = linearY - parabolaHeight;

      // Вращение и масштаб с эффектом отскока
      const rotation = rotateProgress * 720 + randomRotation; // Добавляем конечный угол поворота
      const scale = 1 - scaleProgress * 0.2;

      projectile.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
      projectile.style.opacity = (1 - Math.abs(progress - 0.5) * 0.5).toString();

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Попадание
        targetElement.classList.add('animate-shake');
        setTimeout(() => targetElement.classList.remove('animate-shake'), 500);
        
        // Создаем "прилипший" эмодзи
        const stuckEmoji = document.createElement('div');
        stuckEmoji.className = 'stuck-emoji';
        stuckEmoji.textContent = emoji;
        
        // Используем те же координаты, что и конечная точка полета
        stuckEmoji.style.left = `${randomX}px`;
        stuckEmoji.style.top = `${randomY}px`;
        stuckEmoji.style.transform = `rotate(${randomRotation}deg)`;
        
        // Добавляем эмодзи в карточку
        targetElement.appendChild(stuckEmoji);
        
        // Удаляем летящий эмодзи
        if (document.body.contains(projectile)) {
          document.body.removeChild(projectile);
        }
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (document.body.contains(projectile)) {
        document.body.removeChild(projectile);
      }
    };
  }, [gameState.users]);

  const handleEmojiShake = useCallback(({ userId }: EmojiShakeData) => {
    const targetElement = document.querySelector(`[data-user-id="${userId}"]`);
    if (!targetElement) return;

    const stuckEmojis = targetElement.querySelectorAll('.stuck-emoji');
    if (stuckEmojis?.length) {
      animateEmojisFalling(stuckEmojis);
    }
  }, []);

  const handleEmojiFall = useCallback(() => {
    const stuckEmojis = document.querySelectorAll('.stuck-emoji');
    if (stuckEmojis?.length) {
      animateEmojisFalling(stuckEmojis);
    }
  }, []);

  // Автоматическое подключение при наличии имени в localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('userName');
    if (socket && savedName && !isJoined) {
      console.log('Автоматическое подключение с именем:', savedName);
      socket.emit('user:join', savedName);
      setIsJoined(true);
      setIsConnecting(false);
    } else if (socket) {
      setIsConnecting(false);
    }
  }, [socket]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !name.trim()) {
      setError('Невозможно подключиться к серверу');
      return;
    }

    console.log('Попытка присоединиться с именем:', name);
    localStorage.setItem('userName', name);
    socket.emit('user:join', name);
    setIsJoined(true);
    setError(null);
  };

  const handleVote = (value: number) => {
    if (!socket) {
      setError('Соединение с сервером потеряно');
      return;
    }
    console.log('Попытка проголосовать:', value);
    setCurrentVote(value);
    socket.emit('user:vote', value);
  };

  const handleReveal = () => {
    if (!socket) return;
    socket.emit('votes:reveal');
  };

  const handleReset = () => {
    if (!socket) return;
    socket.emit('game:reset');
    setCurrentVote(null);
  };

  const handleRecalculateAverage = () => {
    if (!socket) return;
    socket.emit('recalculate:average');
  };

  const handleThrowEmoji = (targetId: string, emoji: string) => {
    if (!socket) return;
    console.log('Sending throw:emoji event:', { targetId, emoji });
    socket.emit('throw:emoji', targetId, emoji);
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Подключение к серверу...</div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <LoginForm
        name={name}
        setName={setName}
        error={error}
        socket={socket}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <GameBoard
      socket={socket}
      currentVote={currentVote}
      gameState={gameState}
      error={error}
      onVote={handleVote}
      onReveal={handleReveal}
      onReset={handleReset}
      onResetUsers={() => socket?.emit('users:reset')}
      onRecalculateAverage={handleRecalculateAverage}
      onThrowEmoji={handleThrowEmoji}
      sequence={FIBONACCI_SEQUENCE}
    />
  );
}

export default App; 