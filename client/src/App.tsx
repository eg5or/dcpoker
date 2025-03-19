import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { LoginForm } from './components/LoginForm';
import { useSocket } from './hooks/useSocket';
import type { GameState } from './types';
import { FIBONACCI_SEQUENCE } from './types';

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

    socket.on('game:state', (state: GameState) => {
      console.log('Получено обновление состояния:', state);
      setGameState(state);
      
      // Обновляем текущий выбор из состояния игры
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

    socket.on('poop:thrown', (targetId: string, fromId: string, trajectory: { startX: number; startY: number }) => {
      console.log('Попытка кинуть какашку на:', targetId, 'от:', fromId, 'траектория:', trajectory);
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
      onThrowPoop={handleThrowPoop}
      sequence={FIBONACCI_SEQUENCE}
    />
  );
}

export default App; 