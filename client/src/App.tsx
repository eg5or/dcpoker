import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthPage } from './components/auth/AuthPage';
import { GameBoard } from './components/GameBoard';
import { GlobalStatsPanel } from './components/GlobalStatsPanel';
import { Header } from './components/Header';
import { ProfilePage } from './components/profile/ProfilePage';
import { animateEmojisFalling } from './components/UserCardEffects';
import useSocket from './hooks/useSocket';
import { authService } from './services/auth.service';
import type { GameState } from './types';
import { FIBONACCI_SEQUENCE } from './types';

// Начальное состояние игры
const initialGameState: GameState = {
  users: [],
  isRevealed: false,
  averageVote: null,
  usersChangedVoteAfterReveal: [],
  consistency: null
};

type EmojiThrowData = {
  targetId: string;
  fromId?: string;
  emoji: string;
  trajectory: {
    startX: number;
    startY: number;
    angle: number;
    speed: number;
  };
  placement: {
    x: number;
    y: number;
    rotation: number;
  };
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState(authService.getUser());
  const { socket, connectionFailed } = useSocket(isAuthenticated ? authService.getToken() : null);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
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

  // Выделяем функции обработки анимаций
  const handleEmojiThrown = useCallback(({ targetId, emoji, trajectory, placement }: EmojiThrowData) => {
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
    
    // Используем синхронизированные координаты из параметра placement
    const padding = 20; // отступ от краев
    const randomX = (placement.x / 100) * (targetRect.width - padding * 2) + padding;
    const randomY = (placement.y / 100) * (targetRect.height - padding * 2) + padding;
    
    // Вычисляем абсолютные координаты конечной точки
    const endX = targetRect.left + randomX;
    const endY = targetRect.top + randomY;

    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const maxHeight = distance * 0.3;
    const duration = 1000; // 1 секунда

    let startTime: number | null = null;
    let animationFrameId: number;

    // Используем синхронизированный угол поворота
    const randomRotation = placement.rotation;

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

  const handleEmojiFall = useCallback(() => {
    const stuckEmojis = document.querySelectorAll('.stuck-emoji');
    if (stuckEmojis?.length) {
      console.log('[Shake] Global fall event, all emojis will fall');
      animateEmojisFalling(stuckEmojis, 'all');
    }
  }, []);

  // Обработчик для сокет-события падения эмодзи
  const handleEmojisfall = useCallback((fallTime: number) => {
    if (!isPageVisible.current) {
      pendingAnimations.current.push({
        type: 'fall',
        time: fallTime,
        data: null
      });
      return;
    }
    handleEmojiFall();
  }, [handleEmojiFall]);

  // Обработчик для сокет-события брошенного эмодзи
  const handleSocketEmojiThrown = useCallback((targetId: string, fromId: string, emoji: string, trajectory: any, throwTime: number, placement: { x: number, y: number, rotation: number }) => {
    if (!isPageVisible.current) {
      pendingAnimations.current.push({
        type: 'throw',
        time: throwTime,
        data: { targetId, fromId, emoji, trajectory, placement }
      });
      return;
    }
    handleEmojiThrown({ targetId, fromId, emoji, trajectory, placement });
  }, [handleEmojiThrown]);

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
        case 'fall':
          handleEmojiFall();
          break;
      }
    });

    // Очищаем очередь
    pendingAnimations.current = [];
  }, [gameState.users, handleEmojiThrown, handleEmojiFall]);

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

    // Обработчик обновления состояния игры
    const handleGameState = (state: GameState & { resetTime?: number }) => {
      console.log('Получено обновление состояния:', state);
      if (state.resetTime) {
        lastResetTime.current = state.resetTime;
      }
      setGameState(state);
      
      const currentUser = state.users.find((u: { id: string }) => u.id === socket.id);
      if (currentUser) {
        setCurrentVote(currentUser.vote);
      }
    };

    // Обработчики событий подключения/отключения
    const handleConnectError = (error: Error) => {
      console.error('Ошибка подключения:', error);
      // Показываем ошибку только если пользователь аутентифицирован
      if (isAuthenticated) {
        setError('Ошибка подключения к серверу');
      }
      setIsConnecting(false);
    };

    const handleDisconnect = (reason: string) => {
      console.log('Отключение от сервера, причина:', reason);
      
      // Если отключение связано с выходом пользователя или переходом на страницу логина, не показываем ошибку
      if (!isAuthenticated) {
        setError(null);
      } else {
        setError('Соединение с сервером потеряно');
        setIsJoined(false);
      }
    };

    // Обработчик принудительного выхода
    const handleForceLogout = () => {
      console.log('Получена команда выхода от сервера');
      logout();
    };

    // Регистрируем обработчики событий
    socket.on('game:state', handleGameState);
    socket.on('user:joined', (user: { id: string; name: string }) => console.log('Пользователь присоединился:', user));
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('force:logout', handleForceLogout);
    socket.on('emojis:fall', handleEmojisfall);
    socket.on('emojis:reset', () => socket.emit('emojis:fall'));
    socket.on('emoji:thrown', handleSocketEmojiThrown);
    socket.on('stats:updated', () => {
      console.log('Получено обновление статистики');
      // Можно здесь выполнить действия при обновлении статистики,
      // но основное обновление происходит в компоненте GlobalStatsPanel
    });

    // Отписываемся от событий при размонтировании или изменении сокета
    return () => {
      socket.off('game:state', handleGameState);
      socket.off('user:joined');
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('force:logout', handleForceLogout);
      socket.off('emojis:fall', handleEmojisfall);
      socket.off('emojis:reset');
      socket.off('emoji:thrown', handleSocketEmojiThrown);
    };
  }, [socket, isAuthenticated, handleEmojisfall, handleSocketEmojiThrown]);

  // Автоматическое подключение при наличии аутентификации
  useEffect(() => {
    // Если не аутентифицирован, сразу сбрасываем флаг загрузки
    if (!isAuthenticated) {
      setIsConnecting(false);
      setError(null); // Сбрасываем ошибку при выходе
      return;
    }
    
    // Если есть сокет, значит соединение установлено успешно
    if (socket) {
      setIsConnecting(false);
      setError(null); // Сбрасываем ошибку при успешном подключении
      
      // Если соединение установлено и пользователь не присоединился к игре
      if (isAuthenticated && user && !isJoined) {
        console.log('Автоматическое подключение с именем:', user.name);
        socket.emit('user:join', user.name);
        setIsJoined(true);
      }
    } 
    // Если соединение не удалось, сбрасываем флаг подключения и показываем ошибку
    else if (connectionFailed && isAuthenticated) {
      setIsConnecting(false);
      setError('Не удалось подключиться к серверу. Пожалуйста, перезагрузите страницу или попробуйте позже.');
    }
  }, [socket, isAuthenticated, user, connectionFailed, isJoined]);

  // Сбрасываем ошибку при изменении состояния сокета
  useEffect(() => {
    if (socket) {
      console.log('Сокет доступен, сбрасываем ошибку');
      setError(null);
    }
  }, [socket]);

  const handleLogin = async (login: string, password: string) => {
    try {
      setError(null);
      const userData = await authService.login(login, password);
      setIsAuthenticated(true);
      setUser(userData);
      setIsConnecting(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Неизвестная ошибка при входе');
      }
    }
  };

  const handleRegister = async (displayName: string, login: string, password: string) => {
    try {
      setError(null);
      const userData = await authService.register(displayName, login, password);
      setIsAuthenticated(true);
      setUser(userData);
      setIsConnecting(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Неизвестная ошибка при регистрации');
      }
    }
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
    
    // Генерируем случайные параметры для размещения эмодзи
    const randomX = Math.random() * 100; // Относительная позиция в процентах
    const randomY = Math.random() * 100; // Относительная позиция в процентах
    const randomRotation = Math.random() * 40 - 20; // от -20 до +20 градусов

    // Отправляем параметры на сервер
    socket.emit('throw:emoji', targetId, emoji, {
      x: randomX,
      y: randomY,
      rotation: randomRotation
    });
  };

  const logout = () => {
    console.log('Выполняется выход...');
    // Сначала сбрасываем все состояния на фронтенде
    setError(null);
    setIsJoined(false);
    setGameState({ ...initialGameState });
    setCurrentVote(null);
    setIsAuthenticated(false);
    setUser(null);
    setShowProfile(false);
    
    // Затем очищаем хранилище и токен
    authService.logout();
    
    // Перезагружаем страницу только в случае ошибки подключения,
    // чтобы полностью сбросить состояние сокета
    if (connectionFailed) {
      window.location.reload();
    }
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Подключение к серверу...</div>
      </div>
    );
  }

  // Если подключение не удалось, но пользователь аутентифицирован, показываем сообщение об ошибке и кнопку
  if (connectionFailed && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-xl">Не удалось подключиться к серверу</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Перезагрузить страницу
        </button>
        <button 
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Выйти
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        error={error}
      />
    );
  }

  // Показываем страницу профиля, если она активна
  if (showProfile && user) {
    return (
      <ProfilePage
        userName={user.name}
        userId={user.id}
        onBack={handleBackFromProfile}
      />
    );
  }

  if (!isJoined) {
    // Автоматически присоединяемся к игре с именем из профиля
    if (user && socket) {
      socket.emit('user:join', user.name);
      setIsJoined(true);
    }
    
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Присоединение к игре...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {user && (
        <Header
          userName={user.name}
          onLogout={logout}
          onProfileClick={handleProfileClick}
        />
      )}
      <div className="flex-grow">
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
          onLogout={logout}
        />
        <div className="container mx-auto px-4">
          <GlobalStatsPanel />
        </div>
      </div>
    </div>
  );
}

export default App; 