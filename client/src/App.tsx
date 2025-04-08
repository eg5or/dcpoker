import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AuthPage } from './components/auth/AuthPage';
import { GameBoard } from './components/GameBoard';
import { Header } from './components/Header';
import { ProfilePage } from './components/profile/ProfilePage';
import { CreateRoomModal } from './components/rooms/CreateRoomModal';
import { LandingPage } from './components/rooms/LandingPage';
import { animateEmojisFalling } from './components/UserCardEffects';
import useSocket from './hooks/useSocket';
import { useSocketReconnect } from './hooks/useSocketReconnect';
import { authService } from './services/auth.service';
import { roomService } from './services/room.service';
import type { GameState, Room } from './types';
import { AVAILABLE_EMOJIS, FIBONACCI_SEQUENCE } from './types';

// Константа для ключа в localStorage
const SELECTED_EMOJI_KEY = 'scrum_poker_selected_emoji';

// Начальное состояние игры
const initialGameState: GameState = {
  users: [],
  isRevealed: false,
  averageVote: null,
  usersChangedVoteAfterReveal: [],
  consistency: null,
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

// Вспомогательная функция для получения ID комнаты
const getRoomId = (room: Room): string | undefined => {
  if (room.id && typeof room.id === 'string') {
    return room.id;
  }
  if (room._id && typeof room._id === 'string') {
    return room._id;
  }
  return undefined;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [user, setUser] = useState(authService.getUser());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isRoomsLoading, setIsRoomsLoading] = useState(false);
  const { socket, connectionFailed } = useSocket(isAuthenticated ? authService.getToken() : null);
  useSocketReconnect(socket);
  const [isJoined, setIsJoined] = useState(false);
  const [isConnecting, setIsConnecting] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [currentVote, setCurrentVote] = useState<number | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    users: [],
    isRevealed: false,
    averageVote: null,
    usersChangedVoteAfterReveal: [],
    consistency: null,
  });
  const isPageVisible = useRef(true);
  const lastResetTime = useRef<number>(0);
  const pendingAnimations = useRef<
    Array<{
      type: 'throw' | 'shake' | 'fall';
      time: number;
      data: any;
    }>
  >([]);

  // Добавляем счетчик для отслеживания активных анимаций
  const activeAnimationsCount = useRef(0);
  const lastFrameTime = useRef(Date.now());
  const frameDrops = useRef(0);
  const lastWarningTime = useRef(0);
  const WARNING_THROTTLE = 1000; // Предупреждение не чаще чем раз в секунду
  const monitoringRAF = useRef<number | null>(null);

  // Добавляем состояние для отслеживания последнего успешного состояния
  const [lastValidGameState, setLastValidGameState] = useState<GameState>(initialGameState);
  const throttledEmojis = useRef<number[]>([]);
  const EMOJI_THROTTLE_WINDOW = 2000; // 2 секунды окно для троттлинга
  const MAX_EMOJIS_PER_WINDOW = 5; // максимум 5 эмодзи за 2 секунды

  // Обертка для setIsConnecting с логированием
  const setIsConnectingWithLog = useCallback((value: boolean) => {
    console.log('[Connection] Setting isConnecting to:', value, 'Stack:', new Error().stack);
    setIsConnecting(value);
  }, []);

  // Функция для мониторинга производительности анимаций
  const monitorFrameRate = useCallback(() => {
    // Если нет активных анимаций, останавливаем мониторинг
    if (activeAnimationsCount.current === 0) {
      if (monitoringRAF.current) {
        cancelAnimationFrame(monitoringRAF.current);
        monitoringRAF.current = null;
      }
      frameDrops.current = 0; // Сбрасываем счетчик
      return;
    }

    const now = Date.now();
    const frameTime = now - lastFrameTime.current;
    
    if (frameTime > 32) {
      frameDrops.current++;
      if (now - lastWarningTime.current > WARNING_THROTTLE) {
        console.warn(`[Performance] Low FPS detected: ${Math.round(1000/frameTime)} FPS, Total drops: ${frameDrops.current}`);
        lastWarningTime.current = now;
      }
    }
    
    lastFrameTime.current = now;
    monitoringRAF.current = requestAnimationFrame(monitorFrameRate);
  }, []);

  // Запускаем мониторинг FPS
  useEffect(() => {
    const rafId = requestAnimationFrame(monitorFrameRate);
    return () => cancelAnimationFrame(rafId);
  }, [monitorFrameRate]);

  // Получаем сохраненный эмодзи из localStorage или используем первый из списка
  const getSavedEmoji = (): string => {
    const savedEmoji = localStorage.getItem(SELECTED_EMOJI_KEY);
    if (savedEmoji && AVAILABLE_EMOJIS.includes(savedEmoji)) {
      return savedEmoji;
    }
    return AVAILABLE_EMOJIS[0];
  };

  const [selectedEmoji, setSelectedEmoji] = useState<string>(getSavedEmoji());

  // Загрузка комнат
  const loadRooms = useCallback(async (): Promise<Room[]> => {
    if (!isAuthenticated) return [];
    
    setIsRoomsLoading(true);
    try {
      console.log('Загружаем список комнат...');
      const fetchedRooms = await roomService.getAllRooms();
      console.log('Загружено комнат:', fetchedRooms.length);
      console.log('Полученные комнаты:', fetchedRooms);
      setRooms(fetchedRooms);
      
      // Проверяем, есть ли сохраненная комната напрямую из localStorage
      try {
        // Явное приведение к строке при чтении из localStorage
        const lastRoomId = localStorage.getItem('scrum_poker_last_room');
        console.log('Получено ID последней комнаты из localStorage:', lastRoomId);
        console.log('Тип ID последней комнаты:', typeof lastRoomId);
        
        if (lastRoomId && lastRoomId !== 'undefined' && lastRoomId !== 'null' && fetchedRooms.length > 0) {
          console.log('Ищем комнату с ID:', lastRoomId);
          console.log('ID комнат в списке:', fetchedRooms.map(r => ({ id: getRoomId(r), name: r.name })));
          
          // Ищем комнату по ID или _id
          const room = fetchedRooms.find(r => getRoomId(r) === lastRoomId);
          console.log('Поиск комнаты по ID:', lastRoomId, 'Результат:', room ? 'найдена' : 'не найдена');
          
          if (room) {
            console.log('Найдена последняя комната:', room.name, '(ID:', getRoomId(room), 'Code:', room.code, ')');
            // Устанавливаем выбранную комнату
            setSelectedRoom(room);
            
            // Подключаемся к комнате через сокет, если он доступен
            if (socket) {
              console.log('Подключаемся к последней комнате по коду:', room.code);
              socket.emit('room:join', room.code, user?.name || '');
              setIsJoined(true);
            } else {
              console.warn('Socket недоступен при восстановлении комнаты');
            }
          } else {
            console.log('Комната с ID', lastRoomId, 'не найдена в списке комнат');
            // Если комната не найдена, очищаем localStorage
            localStorage.removeItem('scrum_poker_last_room');
          }
        } else {
          console.log('Нет корректной сохраненной комнаты или список комнат пустой:', 
                     'lastRoomId:', lastRoomId, 
                     'fetchedRooms.length:', fetchedRooms.length);
          
          // Если lastRoomId === 'undefined' или 'null', очищаем localStorage
          if (lastRoomId === 'undefined' || lastRoomId === 'null') {
            console.log('Удаляем некорректное значение ID комнаты из localStorage');
            localStorage.removeItem('scrum_poker_last_room');
          }
        }
      } catch (error) {
        console.error('Ошибка при работе с localStorage:', error);
      }
      
      return fetchedRooms;
    } catch (error) {
      console.error('Ошибка при загрузке комнат:', error);
      return [];
    } finally {
      setIsRoomsLoading(false);
    }
  }, [isAuthenticated, socket, user?.name]);

  // При успешной авторизации загружаем список комнат
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Пользователь аутентифицирован, загружаем комнаты...');
      loadRooms().catch(error => {
        console.error('Ошибка при начальной загрузке комнат:', error);
      });
    } else {
      console.log('Пользователь не аутентифицирован, сбрасываем состояние комнат');
      setRooms([]);
      setSelectedRoom(null);
    }
  }, [isAuthenticated, loadRooms]);

  // Эффект для мониторинга изменений selectedRoom и обновления localStorage
  useEffect(() => {
    if (selectedRoom) {
      // Получаем актуальный ID комнаты
      const roomId = getRoomId(selectedRoom);
      console.log('Выбрана комната:', selectedRoom.name, '(ID:', roomId, ')');
      
      if (roomId && typeof roomId === 'string') {
        try {
          // Принудительно очищаем storage перед записью
          localStorage.removeItem('scrum_poker_last_room');
          // Затем записываем новое значение
          localStorage.setItem('scrum_poker_last_room', roomId);
          console.log('ID комнаты сохранен напрямую в localStorage:', roomId);
          console.log('Проверка: текущее значение в localStorage:', localStorage.getItem('scrum_poker_last_room'));
        } catch (error) {
          console.error('Ошибка при сохранении ID комнаты в localStorage:', error);
        }
      } else {
        console.error('Не удалось определить ID комнаты для сохранения:', selectedRoom);
      }
    } else {
      console.log('Комната не выбрана');
    }
  }, [selectedRoom]);

  // Функция для создания комнаты
  const handleCreateRoom = async (name: string, description?: string, settings?: object, code?: string, emoji?: string): Promise<Room | null> => {
    try {
      // Создание комнаты через сервис
      const room = await roomService.createRoom(name, description, settings, code, emoji);
      
      if (room) {
        toast.success(`Комната "${room.name}" создана!`);
        
        // Обновляем список доступных комнат
        await loadRooms();
        
        // Получаем актуальный ID комнаты
        const roomId = getRoomId(room);
        
        // Проверка, что у комнаты есть валидный ID
        if (!roomId || typeof roomId !== 'string') {
          console.error('Созданная комната не имеет валидного ID:', room);
          return room;
        }
        
        console.log('Созданная комната:', room);
        console.log('ID комнаты для сохранения:', roomId, 'Тип:', typeof roomId);
        
        // Сохраняем ID комнаты в localStorage напрямую
        try {
          localStorage.removeItem('scrum_poker_last_room');
          localStorage.setItem('scrum_poker_last_room', roomId);
          console.log('ID созданной комнаты сохранен в localStorage:', roomId);
          console.log('Значение в localStorage после сохранения:', localStorage.getItem('scrum_poker_last_room'));
        } catch (error) {
          console.error('Ошибка при сохранении ID комнаты в localStorage:', error);
        }
        
        // Переходим в созданную комнату
        setSelectedRoom(room);
        
        // После создания комнаты, присоединяемся к ней через сокет
        if (socket) {
          console.log('Подключаемся к созданной комнате:', room.code);
          socket.emit('room:join', room.code, user?.name || '');
          setIsJoined(true);
        }
        
        return room;
      }
      return null;
    } catch (error) {
      console.error('Ошибка при создании комнаты:', error);
      toast.error('Не удалось создать комнату');
      return null;
    }
  };

  // Обработчик выбора комнаты - должен принимать только строку (roomId)
  const handleSelectRoom = (roomId: string) => {
    console.log('[App] handleSelectRoom вызван с ID:', roomId);

    // Находим комнату по ID
    const room = rooms.find((r) => {
      const id = getRoomId(r);
      return id !== undefined && id === roomId;
    });

    if (!room) {
      console.error('[App] Комната не найдена по ID:', roomId);
      return;
    }

    console.log('[App] Выбрана комната:', room.name, 'ID:', roomId, 'Код:', room.code);

    try {
      localStorage.setItem('scrum_poker_last_room', roomId);
      console.log('[App] Сохранено в localStorage:', roomId);
    } catch (error) {
      console.error('[App] Ошибка при сохранении в localStorage:', error);
    }

    setSelectedRoom(room);
    
    if (socket && user) {
      socket.emit('room:join', room.code, user.name);
    } else {
      console.warn('[App] Socket или user недоступны при выборе комнаты');
    }
  };

  // Обработчик изменения эмодзи с сохранением в localStorage
  const handleEmojiChange = (emoji: string) => {
    setSelectedEmoji(emoji);
    localStorage.setItem(SELECTED_EMOJI_KEY, emoji);
  };

  // Модифицируем обработчик анимаций
  const handleEmojiThrown = useCallback(
    ({ targetId, emoji, trajectory, placement }: EmojiThrowData) => {
      const currentGameState = gameState?.users ? gameState : lastValidGameState;
      
      if (!currentGameState?.users) {
        console.log('[Animation] No valid game state available, skipping animation');
        return;
      }

      // Проверяем, не слишком ли много активных анимаций
      if (activeAnimationsCount.current > 30) {
        console.warn(`[Animation] Too many active animations (${activeAnimationsCount.current}), skipping new ones`);
        return;
      }

      activeAnimationsCount.current++;
      // Запускаем мониторинг при старте анимации если он еще не запущен
      if (!monitoringRAF.current) {
        monitoringRAF.current = requestAnimationFrame(monitorFrameRate);
      }
      console.log(`[Animation] Starting animation. Active count: ${activeAnimationsCount.current}`);
      
      // Проверяем, не было ли оттряхивания после броска
      const targetUser = currentGameState.users.find((u) => u.id === targetId);
      if (targetUser?.lastShakeTime && targetUser.lastShakeTime > Date.now()) {
        activeAnimationsCount.current--; // Уменьшаем счетчик если пропускаем анимацию
        return;
      }

      const targetElement = document.querySelector(`[data-user-id="${targetId}"]`);
      if (!targetElement) {
        activeAnimationsCount.current--; // Уменьшаем счетчик если нет цели
        return;
      }

      // Устанавливаем таймаут для принудительной очистки анимации
      const forceCleanupTimeout = setTimeout(() => {
        console.log('[Animation] Force cleanup triggered');
        activeAnimationsCount.current = Math.max(0, activeAnimationsCount.current - 1);
        if (activeAnimationsCount.current === 0) {
          if (monitoringRAF.current) {
            cancelAnimationFrame(monitoringRAF.current);
            monitoringRAF.current = null;
          }
          frameDrops.current = 0;
        }
      }, 3000); // 3 секунды максимальное время жизни анимации

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
          // Очищаем таймаут принудительной очистки
          clearTimeout(forceCleanupTimeout);
          
          // Попадание
          targetElement.classList.add('shake-animation');
          setTimeout(() => targetElement.classList.remove('shake-animation'), 500);

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

          // Уменьшаем счетчик активных анимаций
          activeAnimationsCount.current = Math.max(0, activeAnimationsCount.current - 1);
          console.log(`[Animation] Animation completed. Active count: ${activeAnimationsCount.current}`);
          
          if (activeAnimationsCount.current === 0) {
            // Останавливаем мониторинг если нет активных анимаций
            if (monitoringRAF.current) {
              cancelAnimationFrame(monitoringRAF.current);
              monitoringRAF.current = null;
            }
            frameDrops.current = 0;
          }
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      const cleanup = () => {
        // Очищаем таймаут принудительной очистки
        clearTimeout(forceCleanupTimeout);
        
        activeAnimationsCount.current = Math.max(0, activeAnimationsCount.current - 1);
        console.log(`[Animation] Animation cleanup. Active count: ${activeAnimationsCount.current}`);
        
        if (activeAnimationsCount.current === 0) {
          if (monitoringRAF.current) {
            cancelAnimationFrame(monitoringRAF.current);
            monitoringRAF.current = null;
          }
          frameDrops.current = 0;
        }
        cancelAnimationFrame(animationFrameId);
        if (document.body.contains(projectile)) {
          document.body.removeChild(projectile);
        }
      };

      return cleanup;
    },
    [gameState, lastValidGameState, monitorFrameRate]
  );

  // Добавляем периодическую проверку и сброс счетчика анимаций
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (activeAnimationsCount.current > 0) {
        console.log(`[Animation] Periodic check - active animations: ${activeAnimationsCount.current}`);
        // Если счетчик слишком большой, сбрасываем его
        if (activeAnimationsCount.current > 30) {
          console.warn(`[Animation] Force resetting high animation count: ${activeAnimationsCount.current}`);
          activeAnimationsCount.current = 0;
          if (monitoringRAF.current) {
            cancelAnimationFrame(monitoringRAF.current);
            monitoringRAF.current = null;
          }
          frameDrops.current = 0;
          // Очищаем все анимации
          document.querySelectorAll('.emoji-projectile').forEach(el => el.remove());
        }
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []);

  const handleEmojiFall = useCallback(() => {
    const stuckEmojis = document.querySelectorAll('.stuck-emoji');
    if (stuckEmojis?.length) {
      console.log('[Shake] Global fall event, all emojis will fall');
      animateEmojisFalling(stuckEmojis, 'all');
    }
  }, []);

  // Обработчик для сокет-события падения эмодзи
  const handleEmojisfall = useCallback(
    (fallTime: number) => {
      if (!isPageVisible.current) {
        pendingAnimations.current.push({
          type: 'fall',
          time: fallTime,
          data: null,
        });
        return;
      }
      handleEmojiFall();
    },
    [handleEmojiFall]
  );

  // Обработчик для сокет-события брошенного эмодзи
  const handleSocketEmojiThrown = useCallback(
    (
      targetId: string,
      fromId: string,
      emoji: string,
      trajectory: any,
      throwTime: number,
      placement: { x: number; y: number; rotation: number }
    ) => {
      if (!isPageVisible.current) {
        pendingAnimations.current.push({
          type: 'throw',
          time: throwTime,
          data: { targetId, fromId, emoji, trajectory, placement },
        });
        return;
      }
      handleEmojiThrown({ targetId, fromId, emoji, trajectory, placement });
    },
    [handleEmojiThrown]
  );

  // Модифицируем processPendingAnimations
  const processPendingAnimations = useCallback(() => {
    if (!isPageVisible.current || pendingAnimations.current.length === 0) return;

    console.log(`[Queue] Processing animations queue. Size: ${pendingAnimations.current.length}`);
    
    if (pendingAnimations.current.length > 20) {
      console.warn(`[Queue] Large animation queue: ${pendingAnimations.current.length}`);
    }

    // Сортируем анимации по времени
    pendingAnimations.current.sort((a, b) => a.time - b.time);

    // Проверяем, есть ли сброс среди отложенных анимаций
    const lastReset = pendingAnimations.current.filter((anim) => anim.type === 'fall').pop();

    if (lastReset) {
      // Если есть сброс, отбрасываем все анимации до него
      pendingAnimations.current = pendingAnimations.current.filter(
        (anim) => anim.time >= lastReset.time
      );
    }

    // Фильтруем устаревшие анимации
    pendingAnimations.current = pendingAnimations.current.filter((anim) => {
      // Всегда пропускаем анимации после глобального сброса
      if (anim.time < lastResetTime.current) return false;

      // Для бросков эмодзи проверяем время оттряхивания цели
      if (anim.type === 'throw' && gameState?.users) {
        const targetUser = gameState.users.find((u) => u.id === anim.data.targetId);
        if (targetUser?.lastShakeTime && anim.time < targetUser.lastShakeTime) {
          return false;
        }
      }

      return true;
    });

    // Выполняем оставшиеся анимации
    pendingAnimations.current.forEach((animation) => {
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

    const handleGameState = (state: GameState) => {
      if (state?.users?.length > 0) {
        setLastValidGameState(state);
      }
      setGameState(state);
    };

    const handleReconnect = () => {
      console.log('[Socket] Reconnected, restoring state...');
      if (selectedRoom) {
        console.log('[Socket] Rejoining room:', selectedRoom.code);
        socket.emit('room:join', selectedRoom.code, user?.name || '');
      }
    };

    const handleDisconnect = (reason: string) => {
      console.log('[Socket] Disconnected, reason:', reason);
      if (reason === 'io server disconnect') {
        // Сервер разорвал соединение, пробуем переподключиться
        socket.connect();
      }
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

    // Обработчик ошибок комнаты
    const handleRoomError = (errorMsg: string) => {
      console.error('Ошибка комнаты:', errorMsg);
      setError(errorMsg);
    };

    // Регистрируем обработчики событий
    socket.on('game:state', handleGameState);
    socket.on('game:state:batch', (states: GameState[]) => {
      // Применяем только последнее состояние из пакета
      if (states.length > 0) {
        setGameState(states[states.length - 1]);
      }
    });

    socket.on('user:joined', (user: { id: string; name: string }) =>
      console.log('Пользователь присоединился:', user)
    );
    socket.on('connect', handleReconnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('force:logout', handleForceLogout);
    socket.on('room:error', handleRoomError);
    socket.on('emojis:fall', handleEmojisfall);
    socket.on('emojis:reset', () => socket.emit('emojis:fall'));
    socket.on('emoji:thrown', handleSocketEmojiThrown);
    socket.on('emoji:thrown:batch', (events: [string, string, string, any, number, any][]) => {
      // Обрабатываем каждое событие из пакета
      events.forEach(([targetId, fromId, emoji, trajectory, throwTime, placement]) => {
        handleSocketEmojiThrown(targetId, fromId, emoji, trajectory, throwTime, placement);
      });
    });
    socket.on('stats:updated', () => {
      console.log('Получено обновление статистики');
    });

    // Отписываемся от событий при размонтировании или изменении сокета
    return () => {
      socket.off('game:state', handleGameState);
      socket.off('game:state:batch');
      socket.off('user:joined');
      socket.off('connect', handleReconnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('force:logout', handleForceLogout);
      socket.off('room:error', handleRoomError);
      socket.off('emojis:fall', handleEmojisfall);
      socket.off('emojis:reset');
      socket.off('emoji:thrown', handleSocketEmojiThrown);
      socket.off('emoji:thrown:batch');
      socket.off('stats:updated');
    };
  }, [socket, isAuthenticated, handleEmojisfall, handleSocketEmojiThrown]);

  // Заменяем все использования setIsConnecting на setIsConnectingWithLog
  useEffect(() => {
    if (!isAuthenticated) {
      setIsConnectingWithLog(false);
      setError(null);
      return;
    }

    if (socket) {
      setIsConnectingWithLog(false);
      setError(null);
      
      if (isAuthenticated && user && !isJoined && selectedRoom) {
        socket.emit('room:join', selectedRoom.code, user.name);
        setIsJoined(true);
      }
    }
    else if (connectionFailed && isAuthenticated) {
      setIsConnectingWithLog(false);
      setError('Не удалось подключиться к серверу...');
    }
  }, [socket, isAuthenticated, user, connectionFailed, isJoined, selectedRoom, setIsConnectingWithLog]);

  // Сбрасываем ошибку при изменении состояния сокета
  useEffect(() => {
    if (socket) {
      console.log('Сокет доступен, сбрасываем ошибку');
      setError(null);
    }
  }, [socket]);

  // Добавить обработчик события rooms:usersCount
  useEffect(() => {
    if (!socket) return;

    // Обработчик обновления количества пользователей в комнатах
    const handleRoomsUsersCount = (roomsUsersCount: { 
      [roomCode: string]: { 
        id: string, 
        code: string, 
        onlineUsersCount: number,
        onlineUsers: string[] // Добавили поле
      } 
    }) => {
      setRooms(prevRooms => {
        if (!prevRooms) return prevRooms;
        
        return prevRooms.map(room => {
          const roomInfo = roomsUsersCount[room.code];
          if (roomInfo) {
            return {
              ...room,
              onlineUsersCount: roomInfo.onlineUsersCount,
              onlineUsers: roomInfo.onlineUsers // Сохраняем список имен
            };
          }
          return room;
        });
      });
    };

    // Регистрируем обработчик события
    socket.on('rooms:usersCount', handleRoomsUsersCount);

    // Отписываемся при размонтировании
    return () => {
      socket.off('rooms:usersCount', handleRoomsUsersCount);
    };
  }, [socket]);

  const handleLogin = async (login: string, password: string) => {
    try {
      setError(null);
      const userData = await authService.login(login, password);
      setIsAuthenticated(true);
      setUser(userData);
      setIsConnectingWithLog(true);
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
      setIsConnectingWithLog(true);
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

  const handleThrowEmoji = useCallback((targetId: string, emoji: string) => {
    if (!socket) return;

    const now = Date.now();
    
    // Очищаем старые броски
    throttledEmojis.current = throttledEmojis.current.filter(
      time => now - time < EMOJI_THROTTLE_WINDOW
    );

    // Проверяем количество бросков в окне
    if (throttledEmojis.current.length >= MAX_EMOJIS_PER_WINDOW) {
      console.log(`[Emoji] Throttled: ${throttledEmojis.current.length} emojis in last ${EMOJI_THROTTLE_WINDOW}ms`);
      return;
    }

    // Добавляем новый бросок
    throttledEmojis.current.push(now);

    // Генерируем случайные параметры для размещения эмодзи
    const randomX = Math.random() * 100;
    const randomY = Math.random() * 100;
    const randomRotation = Math.random() * 40 - 20;

    console.log(`[Emoji] Throwing emoji (${throttledEmojis.current.length}/${MAX_EMOJIS_PER_WINDOW} in window)`);
    
    socket.emit('throw:emoji', targetId, emoji, {
      x: randomX,
      y: randomY,
      rotation: randomRotation,
    });
  }, [socket]);

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

  // Обработчик выхода из комнаты
  const handleLeaveRoom = () => {
    console.log('[App] Выход из комнаты');
    
    // Удаляем сохраненный ID комнаты из localStorage
    try {
      localStorage.removeItem('scrum_poker_last_room');
      console.log('[App] ID комнаты удален из localStorage');
    } catch (error) {
      console.error('[App] Ошибка при удалении ID комнаты из localStorage:', error);
    }
    
    // Сбрасываем выбранную комнату
    setSelectedRoom(null);
    
    // Отключаемся от текущей комнаты через Socket.IO
    if (socket) {
      socket.emit('room:leave');
      console.log('[App] Отправлен запрос на выход из комнаты');
    }
    
    setIsJoined(false);
  };

  // Убираем автозапуск мониторинга
  useEffect(() => {
    return () => {
      if (monitoringRAF.current) {
        cancelAnimationFrame(monitoringRAF.current);
      }
    };
  }, []);

  // Добавляем очистку анимаций при отключении от комнаты
  useEffect(() => {
    if (!socket) {
      // Сбрасываем все счетчики анимаций при отключении
      activeAnimationsCount.current = 0;
      frameDrops.current = 0;
      if (monitoringRAF.current) {
        cancelAnimationFrame(monitoringRAF.current);
        monitoringRAF.current = null;
      }
      // Удаляем все оставшиеся эмодзи
      document.querySelectorAll('.emoji-projectile').forEach(el => el.remove());
      document.querySelectorAll('.stuck-emoji').forEach(el => el.remove());
    }
  }, [socket]);

  // Добавляем обработку ошибок сокета
  useEffect(() => {
    if (!socket) return;

    const handleError = (error: Error) => {
      console.error('[Socket] Error:', error);
      // Если произошла ошибка сокета, пробуем переподключиться
      if (!socket.connected) {
        console.log('[Socket] Attempting to reconnect...');
        socket.connect();
      }
    };

    socket.on('error', handleError);
    
    return () => {
      socket.off('error', handleError);
    };
  }, [socket]);

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
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} error={null} />;
  }

  if (showProfile) {
    return <ProfilePage userName={user?.name || ''} userId={user?.id || ''} onBack={handleBackFromProfile} />;
  }

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Подключение к серверу...</div>
      </div>
    );
  }

  /* Модальное окно создания комнаты должно быть доступно глобально */
  const createRoomModal = showCreateRoomModal && (
    <CreateRoomModal
      onClose={() => setShowCreateRoomModal(false)}
      onCreateRoom={async (name, description, settings, code, emoji) => {
        const result = await handleCreateRoom(name, description, settings, code, emoji);
        if (result) {
          setShowCreateRoomModal(false);
        }
        return result;
      }}
    />
  );

  // Если еще не выбрана комната, показываем LandingPage
  if (!selectedRoom) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-900 text-white">
        <Header
          userName={user?.name || ''}
          onLogout={logout}
          onProfileClick={handleProfileClick}
          selectedEmoji={selectedEmoji}
          onSelectEmoji={handleEmojiChange}
          rooms={rooms}
          selectedRoom={selectedRoom}
          onSelectRoom={handleSelectRoom}
          onCreateRoom={handleCreateRoom}
        />
        <div className="flex-1 overflow-y-auto">
          <LandingPage
            rooms={rooms}
            onSelectRoom={handleSelectRoom}
            onCreateRoom={() => {
              console.log('Открываем модальное окно создания комнаты');
              setShowCreateRoomModal(true);
            }}
            isLoading={isRoomsLoading}
          />
        </div>
        {createRoomModal}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header
        userName={user?.name || ''}
        onLogout={logout}
        onProfileClick={handleProfileClick}
        selectedEmoji={selectedEmoji}
        onSelectEmoji={handleEmojiChange}
        rooms={rooms}
        selectedRoom={selectedRoom}
        onSelectRoom={handleSelectRoom}
        onCreateRoom={handleCreateRoom}
      />
      
      {createRoomModal}

      {isConnecting ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-xl">Подключение к серверу...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center mx-auto max-w-md p-6 bg-red-900 bg-opacity-25 border border-red-700 rounded-lg">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-4">Ошибка</h2>
            <p className="mb-4">{error}</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={() => window.location.reload()}
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      ) : (
        <GameBoard
          socket={socket}
          gameState={gameState}
          error={error}
          onVote={handleVote}
          currentVote={currentVote}
          onReveal={handleReveal}
          onReset={handleReset}
          onResetUsers={() => socket?.emit('users:reset')}
          onRecalculateAverage={handleRecalculateAverage}
          onThrowEmoji={handleThrowEmoji}
          sequence={FIBONACCI_SEQUENCE}
          selectedEmoji={selectedEmoji}
          onEmojiChange={handleEmojiChange}
          selectedRoom={selectedRoom}
          currentUser={socket?.id || ''}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;
