import { useEffect, useRef, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import type { GameState, PoopTrajectory } from './types';
import { FIBONACCI_SEQUENCE } from './types';

function App() {
  const socket = useSocket();
  const [name, setName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [poopAnimation, setPoopAnimation] = useState<{ targetId: string, fromId: string } | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    users: [],
    isRevealed: false,
    averageVote: null,
    usersChangedVoteAfterReveal: [],
    consistency: null
  });
  const [poopProjectiles, setPoopProjectiles] = useState<Array<{
    id: string;
    targetId: string;
    fromId: string;
    trajectory: PoopTrajectory;
  }>>([]);
  const projectileIdCounter = useRef(0);

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

  useEffect(() => {
    if (!socket) return;

    socket.on('game:state', (state) => {
      console.log('Получено обновление состояния:', state);
      setGameState(state);
      
      // Обновляем текущий выбор из состояния игры
      const currentUser = state.users.find(u => u.id === socket.id);
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

    socket.on('poop:thrown', (targetId: string, fromId: string, trajectory: PoopTrajectory) => {
      const projectileId = `poop-${projectileIdCounter.current++}`;
      
      const targetElement = document.querySelector(`[data-user-id="${targetId}"]`);
      if (!targetElement) return;

      const projectile = document.createElement('div');
      projectile.className = 'poop-projectile';
      projectile.textContent = '💩';
      document.body.appendChild(projectile);

      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const targetRect = targetElement.getBoundingClientRect();
      
      const startX = (trajectory.startX / 100) * windowWidth;
      const startY = (trajectory.startY / 100) * windowHeight;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      const angle = Math.atan2(endY - startY, endX - startX);
      const maxHeight = distance * 0.3;
      const duration = 1000; // 1 секунда

      let startTime: number | null = null;
      let animationFrameId: number;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Параболическая траектория
        const x = startX + (endX - startX) * progress;
        const linearY = startY + (endY - startY) * progress;
        const parabolaHeight = Math.sin(progress * Math.PI) * maxHeight;
        const y = linearY - parabolaHeight;

        // Вращение и масштаб
        const rotation = progress * 360;
        const scale = 1 - Math.sin(progress * Math.PI) * 0.1;

        projectile.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Попадание
          targetElement.classList.add('animate-shake');
          setTimeout(() => targetElement.classList.remove('animate-shake'), 500);
          
          // Эффект сжатия при попадании
          projectile.style.transform = `translate(${endX}px, ${endY}px) scale(0.5)`;
          setTimeout(() => {
            document.body.removeChild(projectile);
          }, 100);
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrameId);
        if (document.body.contains(projectile)) {
          document.body.removeChild(projectile);
        }
      };
    });

    return () => {
      socket.off('game:state');
      socket.off('user:joined');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('force:logout');
      socket.off('poop:thrown');
    };
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

  const handleThrowPoop = (targetId: string) => {
    if (!socket) return;
    socket.emit('throw:poop', targetId);
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <form onSubmit={handleJoin} className="bg-gray-800 p-8 rounded-lg shadow-xl">
          <h1 className="text-2xl text-white mb-4">Войти в Scrum Poker</h1>
          {error && (
            <div className="bg-red-500 text-white p-3 rounded mb-4">
              {error}
            </div>
          )}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Присоединиться
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-3 rounded">
          {error}
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl text-white">Scrum Poker</h1>
            {currentVote !== null && (
              <div className="bg-blue-500 px-4 py-2 rounded">
                <span className="text-white">Ваш выбор: {currentVote}</span>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleReveal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Показать карты
            </button>
            <button
              onClick={handleReset}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Сбросить
            </button>
            <button
              onClick={() => socket?.emit('users:reset')}
              className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
            >
              Сбросить всех пользователей
            </button>
          </div>
        </div>

        {gameState.isRevealed && gameState.usersChangedVoteAfterReveal.length > 0 && (
          <div className="bg-yellow-500 text-black p-4 rounded-lg mb-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {gameState.usersChangedVoteAfterReveal.length === 1
                    ? `Пользователь ${gameState.usersChangedVoteAfterReveal[0]} изменил свою оценку`
                    : `Пользователи ${gameState.usersChangedVoteAfterReveal.join(', ')} изменили свои оценки`
                  }
                </p>
                <p className="text-sm mt-1">Необходимо пересчитать среднее значение</p>
              </div>
              <button
                onClick={handleRecalculateAverage}
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                Пересчитать
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...gameState.users]
            .sort((a, b) => {
              // Сначала сортируем по онлайн статусу
              if (a.isOnline && !b.isOnline) return -1;
              if (!a.isOnline && b.isOnline) return 1;
              // Если оба онлайн или оба оффлайн, сортируем по времени подключения (последние будут первыми)
              if (a.isOnline === b.isOnline) {
                return b.joinedAt - a.joinedAt;
              }
              return 0;
            })
            .map((user) => (
              <div
                key={user.id}
                data-user-id={user.id}
                className={`bg-gray-800 p-6 rounded-lg shadow-lg relative ${
                  user.changedVoteAfterReveal ? 'ring-2 ring-yellow-500' : ''
                }`}
                onClick={() => user.id !== socket?.id && handleThrowPoop(user.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl text-white">{user.name}</h3>
                  <div className="flex items-center gap-2">
                    {user.poopAttacks > 0 && (
                      <span className="poop-counter">
                        💩 x{user.poopAttacks}
                      </span>
                    )}
                    <span className={`h-3 w-3 rounded-full ${
                      user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                  </div>
                </div>
                {user.vote !== null && (
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${
                      gameState.isRevealed 
                        ? user.changedVoteAfterReveal 
                          ? 'text-yellow-500'
                          : 'text-white'
                        : 'text-gray-500'
                    }`}>
                      {gameState.isRevealed ? (user.vote === 0.1 ? '☕️' : user.vote === 0.5 ? '½' : user.vote) : '?'}
                    </span>
                  </div>
                )}
              </div>
            ))}
        </div>

        {gameState.isRevealed && gameState.averageVote !== null && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl text-white mb-2">Средняя оценка</h2>
                <p className="text-4xl font-bold text-blue-500">
                  {gameState.averageVote}
                </p>
              </div>
              {gameState.consistency && (
                <div className="text-center">
                  <div className="text-6xl mb-2">{gameState.consistency.emoji}</div>
                  <p className="text-white text-sm">{gameState.consistency.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
          {FIBONACCI_SEQUENCE.map((value) => (
            <button
              key={value}
              onClick={() => handleVote(value)}
              className={`aspect-[2/3] text-white text-xl font-bold rounded-lg flex items-center justify-center transition-colors ${
                currentVote === value 
                  ? 'bg-blue-700 ring-2 ring-white' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {value === 0.1 ? '☕️' : value === 0.5 ? '½' : value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App; 