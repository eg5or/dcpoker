import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './config/jwt.js';
import { RoomInterface } from './models/room.model.js';
import { User } from './models/user.model.js';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import sessionRoutes from './routes/session.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import statsRoutes from './routes/stats.routes.js';
import { RoomService } from './services/room.service.js';
import { StatsService } from './services/stats.service.js';
import { calculateAverageVote } from './utils/calculateAverageVote.js';
import { completeCurrentSession } from './utils/completeCurrentSession.js';
import { createOrUpdateVotingSession, VotingSessionDocument } from './utils/createOrUpdateVotingSession.js';
import { emojisShake } from './utils/emojisShake.js';
import { initializeIO } from './utils/io.js';
import { throwEmoji } from './utils/throwEmoji.js';
import { updateSessionOnReveal } from './utils/updateSessionOnReveal.js';

// Загружаем переменные окружения
dotenv.config();

// Инициализируем Express приложение
const app = express();
const httpServer = createServer(app);

// Получаем origins из env и преобразуем в массив
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'];
console.log('🔒 Разрешенные CORS домены:', corsOrigins);

// Настройка middleware для Express с более строгими правилами CORS
app.use(
  cors({
    origin: function (origin, callback) {
      console.log('📥 Входящий запрос с origin:', origin || 'нет origin (локальный)');

      // Для режима разработки и инструментов без origin
      if (!origin) {
        console.log('✅ Запрос без origin разрешен (локальный инструмент или разработка)');
        return callback(null, true);
      }

      // Проверяем, находится ли origin в списке разрешенных
      if (corsOrigins.indexOf(origin) !== -1) {
        console.log(`✅ Origin "${origin}" разрешен`);
        callback(null, true);
      } else {
        console.error(`❌ CORS блокировка: "${origin}" не в списке разрешенных доменов`);
        callback(new Error('Не разрешено политикой CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Range'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем маршруты API
console.log('🛠️ Подключение маршрутов API...');
app.use('/api/auth', authRoutes);
console.log('✅ Подключены маршруты аутентификации');
app.use('/api/stats', statsRoutes);
console.log('✅ Подключены маршруты статистики');
app.use('/api/settings', settingsRoutes);
console.log('✅ Подключены маршруты настроек');
app.use('/api/sessions', sessionRoutes);
console.log('✅ Подключены маршруты сессий');
app.use('/api/rooms', roomRoutes);
console.log('✅ Подключены маршруты комнат');

// Обработчик ошибок для неверных маршрутов
app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

// Обработчик ошибок для ошибок сервера
app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Подключаемся к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dcpoker';

// Функция для подключения к БД (перенесено из config/db.js)
export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Подключаемся к базе данных
connectDB();

// Настройка Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Для режима разработки и инструментов без origin
      if (!origin) {
        console.log('Socket.IO запрос без origin (локальный инструмент или разработка)');
        // В продакшене мы можем быть более строгими здесь, но для разработки разрешаем
        return callback(null, true);
      }

      // Проверяем, находится ли origin в списке разрешенных
      if (corsOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.error(`Socket.IO CORS блокировка: ${origin} не в списке разрешенных доменов`);
        callback(new Error('Не разрешено политикой CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: parseInt(process.env.PING_TIMEOUT || '10000'),
  pingInterval: parseInt(process.env.PING_INTERVAL || '5000'),
});

// Инициализируем io для использования в других модулях
initializeIO(io);

// Определяем интерфейс для сокета с пользовательскими данными
export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    name: string;
  };
  roomCode?: string; // Добавляем код комнаты, к которой подключен сокет
}

// Обновляем использование io.use с правильным типом
io.use(async (socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next();
  }

  const decoded = verifyToken(token);
  if (decoded) {
    try {
      const user = await User.findById(decoded.id);
      if (user) {
        socket.user = {
          id: user._id?.toString() || decoded.id,
          name: user.username,
        };
      }
    } catch (error) {
      console.error('Ошибка при проверке пользователя:', error);
    }
  }

  next();
});

// Тип для пользователя в состоянии игры
type GameStateUser = {
  id: string;
  name: string;
  isOnline: boolean;
  vote: number | null;
  changedVoteAfterReveal?: boolean;
  joinedAt: number;
  emojiAttacks: {
    [emoji: string]: number;
  };
  lastResetTime?: number;
  lastShakeTime?: number;
};

// Тип для состояния игры
export type GameState = {
  users: GameStateUser[];
  isRevealed: boolean;
  averageVote: number | null;
  usersChangedVoteAfterReveal: string[];
  consistency: {
    emoji: string;
    description: string;
  } | null;
};

// Карта активных сессий по комнатам
type RoomSessions = {
  [roomCode: string]: {
    gameState: GameState;
    currentSession: VotingSessionDocument | null;
  };
};

// Карта состояний игры по комнатам
export const roomSessions: RoomSessions = {};

// Функция для безопасной работы с сессией
export function useSession<T>(session: VotingSessionDocument | null, callback: (session: VotingSessionDocument) => T): T | null {
  if (!session) return null;
  return callback(session as VotingSessionDocument);
}

// Функция для получения или создания состояния комнаты
function getRoomSession(roomCode: string): { gameState: GameState; currentSession: VotingSessionDocument | null } {
  if (!roomSessions[roomCode]) {
    roomSessions[roomCode] = {
      gameState: {
        users: [],
        isRevealed: false,
        averageVote: null,
        usersChangedVoteAfterReveal: [],
        consistency: null,
      },
      currentSession: null,
    };
  }
  return roomSessions[roomCode];
}

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log('User connected:', socket.id);

  // При подключении отправляем пустое состояние игры
  // Реальное состояние будет отправлено после присоединения к комнате
  socket.emit('game:state', {
    users: [],
    isRevealed: false,
    averageVote: null,
    usersChangedVoteAfterReveal: [],
    consistency: null,
  });

  // Обработка присоединения к комнате
  socket.on('room:join', async (roomCode: string, name: string) => {
    console.log(`User ${name} (socket.id: ${socket.id}) joining room ${roomCode}`);
    
    // Проверяем, существует ли комната
    const room = await RoomService.getRoomByCode(roomCode);
    if (!room) {
      console.error(`Room with code ${roomCode} not found!`);
      socket.emit('room:error', 'Комната не найдена');
      return;
    }
    
    console.log(`Room found: ${room.name} (ID: ${(room as any)._id.toString()})`);

    // Если сокет уже был в другой комнате, отсоединяем его
    if (socket.roomCode && socket.roomCode !== roomCode) {
      console.log(`Socket was in room ${socket.roomCode}, disconnecting before joining ${roomCode}`);
      socket.leave(socket.roomCode);
      
      // Обновляем статус пользователя в старой комнате
      const oldRoomSession = getRoomSession(socket.roomCode);
      const oldUser = oldRoomSession.gameState.users.find((u) => u.id === socket.id);
      if (oldUser) {
        console.log(`Marking user ${oldUser.name} as offline in the previous room ${socket.roomCode}`);
        oldUser.isOnline = false;
        io.to(socket.roomCode).emit('game:state', oldRoomSession.gameState);
      }
    }

    // Присоединяем сокет к комнате
    console.log(`Joining socket ${socket.id} to room ${roomCode}`);
    socket.join(roomCode);
    socket.roomCode = roomCode;

    // Обновляем время активности комнаты
    const roomId = (room as RoomInterface & { _id: mongoose.Types.ObjectId })._id.toString();
    console.log(`Updating last activity for room ${roomId}`);
    await RoomService.updateLastActivity(roomId);

    // Получаем или создаем сессию для комнаты
    const { gameState, currentSession } = getRoomSession(roomCode);

    // Создаем/обновляем сессию голосования, если пользователь аутентифицирован
    if (socket.user && socket.user.id) {
      console.log(`Authenticated user ${socket.user.name} (ID: ${socket.user.id}) joined the room`);
      roomSessions[roomCode].currentSession = await createOrUpdateVotingSession(currentSession, socket.user.id);

      // Добавляем пользователя в список участников сессии, если его там еще нет
      if (roomSessions[roomCode].currentSession) {
        const participants = useSession(roomSessions[roomCode].currentSession, session => session.get('participants')) || [];
        const userId = new mongoose.Types.ObjectId(socket.user.id);

        if (!participants.some((p: mongoose.Types.ObjectId) => p.toString() === userId.toString())) {
          console.log(`Adding user ${socket.user.name} to session participants`);
          participants.push(userId);
          useSession(roomSessions[roomCode].currentSession, session => session.set({ participants }));
          await useSession(roomSessions[roomCode].currentSession, session => session.save());
        }
      }
    }

    // Обновляем пользователя в списке участников комнаты
    const existingUser = gameState.users.find((u) => u.name === name);
    if (existingUser) {
      console.log(`User ${name} already exists in room ${roomCode}, updating socket ID from ${existingUser.id} to ${socket.id}`);
      existingUser.id = socket.id;
      existingUser.isOnline = true;
      existingUser.vote = null;
      existingUser.changedVoteAfterReveal = false;
      existingUser.joinedAt = Date.now();
      existingUser.emojiAttacks = {};
    } else {
      console.log(`Adding new user ${name} to room ${roomCode}`);
      const user: GameStateUser = {
        id: socket.id,
        name,
        isOnline: true,
        vote: null,
        changedVoteAfterReveal: false,
        joinedAt: Date.now(),
        emojiAttacks: {},
      };
      gameState.users.push(user);
    }

    console.log(`Users in room ${roomCode}:`, gameState.users.map(u => `${u.name} (${u.isOnline ? 'online' : 'offline'})`));
    
    // Отправляем обновленное состояние всем в комнате
    console.log(`Emitting updated game state to room ${roomCode}`);
    io.to(roomCode).emit('game:state', gameState);
    
    // Отправляем обновленные данные о количестве пользователей
    await broadcastRoomsUsersCount();
  });

  socket.on('user:vote', (value: number) => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    console.log('Vote received:', socket.id, value, 'in room', socket.roomCode);
    const { gameState } = getRoomSession(socket.roomCode);
    
    const user = gameState.users.find((u) => u.id === socket.id);
    if (user) {
      if (gameState.isRevealed && user.vote !== null && user.vote !== value) {
        user.changedVoteAfterReveal = true;
        if (!gameState.usersChangedVoteAfterReveal.includes(user.name)) {
          gameState.usersChangedVoteAfterReveal.push(user.name);
        }
      }
      user.vote = value;
      console.log('Vote registered for user:', user);
      io.to(socket.roomCode).emit('game:state', gameState);
    } else {
      console.log('User not found:', socket.id);
    }
  });

  socket.on('votes:reveal', async () => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    const { gameState, currentSession } = getRoomSession(socket.roomCode);
    gameState.isRevealed = true;
    calculateAverageVote(gameState);

    // Обновляем сессию и статистику при раскрытии карт
    await updateSessionOnReveal(currentSession, gameState, io);

    io.to(socket.roomCode).emit('game:state', gameState);
  });

  socket.on(
    'throw:emoji',
    async (targetUserId: string, emoji: string, placement: { x: number; y: number; rotation: number }) => {
      if (!socket.roomCode) {
        socket.emit('room:error', 'Вы не присоединились к комнате');
        return;
      }

      const { gameState, currentSession } = getRoomSession(socket.roomCode);
      await throwEmoji(targetUserId, emoji, placement, gameState, io, socket, currentSession);
    }
  );

  socket.on('game:reset', async () => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    const { gameState, currentSession } = getRoomSession(socket.roomCode);

    // Завершаем текущую сессию перед сбросом
    await completeCurrentSession(currentSession, gameState);

    const resetTime = Date.now();
    // Сбрасываем состояние игры
    gameState.users.forEach((user) => {
      user.vote = null;
      user.changedVoteAfterReveal = false;
      user.emojiAttacks = {};
      user.lastResetTime = resetTime;
    });
    gameState.isRevealed = false;
    gameState.averageVote = null;
    gameState.usersChangedVoteAfterReveal = [];

    // Создаем новую сессию для следующего раунда
    if (socket.user && socket.user.id) {
      roomSessions[socket.roomCode].currentSession = await createOrUpdateVotingSession(null, socket.user.id);
    }

    // Отправляем обновленное состояние с временем сброса
    io.to(socket.roomCode).emit('game:state', { ...gameState, resetTime });

    // После обновления состояния отправляем сигнал для анимации падения
    io.to(socket.roomCode).emit('emojis:fall', resetTime);
  });

  // Обработка выхода из комнаты (перемещено на правильный уровень)
  socket.on('room:leave', () => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    console.log(`User ${socket.id} leaving room ${socket.roomCode}`);
    
    // Обновляем статус пользователя в комнате
    const { gameState } = getRoomSession(socket.roomCode);
    const user = gameState.users.find((u) => u.id === socket.id);
    if (user) {
      console.log(`Marking user ${user.name} as offline in room ${socket.roomCode}`);
      user.isOnline = false;
      io.to(socket.roomCode).emit('game:state', gameState);
    }

    // Отсоединяем сокет от комнаты
    socket.leave(socket.roomCode);
    socket.roomCode = undefined; // Очищаем roomCode
    
    console.log(`User ${socket.id} has left the room`);
    
    // Отправляем обновленные данные о количестве пользователей
    broadcastRoomsUsersCount();
  });

  socket.on('emojis:shake', async (userId: string) => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    const { gameState } = getRoomSession(socket.roomCode);
    await emojisShake(userId, gameState, io, socket);
  });

  socket.on('users:reset', () => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    const { gameState } = getRoomSession(socket.roomCode);
    
    // Очищаем список пользователей
    gameState.users = [];
    gameState.isRevealed = false;
    gameState.averageVote = null;
    gameState.usersChangedVoteAfterReveal = [];
    gameState.consistency = null;

    // Отправляем всем клиентам в комнате команду на разлогинивание
    io.to(socket.roomCode).emit('force:logout');
    // Отправляем обновленное состояние
    io.to(socket.roomCode).emit('game:state', gameState);
  });

  socket.on('recalculate:average', async () => {
    if (!socket.roomCode) {
      socket.emit('room:error', 'Вы не присоединились к комнате');
      return;
    }

    const { gameState, currentSession } = getRoomSession(socket.roomCode);
    
    if (gameState.isRevealed) {
      calculateAverageVote(gameState);

      // Обновляем сессию с новыми данными по изменённым голосам
      if (currentSession) {
        const votes = useSession(currentSession, session => session.get('votes')) || [];

        // Обновляем финальные голоса и помечаем изменённые
        for (const user of gameState.users) {
          if (user.vote !== null) {
            // Определяем userId для поиска в базе данных
            let searchUserId: string | mongoose.Types.ObjectId = user.id;

            // Если пользователь аутентифицирован, используем его MongoDB ID
            const userSocket = Array.from(io.sockets.sockets.values()).find(
              (s) => (s as any).id === user.id
            ) as AuthenticatedSocket | undefined;

            if (userSocket?.user?.id) {
              searchUserId = new mongoose.Types.ObjectId(userSocket.user.id);
            }

            // Ищем голос пользователя
            const voteIndex = votes.findIndex((v: any) => {
              if (!v || !v.userId) return false;

              // Проверяем соответствие userId с учетом разных типов
              if (typeof v.userId === 'string' && typeof searchUserId === 'string') {
                return v.userId === searchUserId;
              } else if (typeof v.userId === 'string' && typeof searchUserId !== 'string') {
                return v.userId === searchUserId.toString();
              } else if (typeof v.userId !== 'string' && typeof searchUserId === 'string') {
                return v.userId.toString() === searchUserId;
              } else {
                return v.userId.toString() === searchUserId.toString();
              }
            });

            console.log(`Поиск голоса для пользователя ${user.name}: найден индекс ${voteIndex}`);

            if (voteIndex !== -1) {
              // Проверяем, изменился ли голос
              if (votes[voteIndex].initialVote !== user.vote) {
                // Помечаем голос как изменённый, если он еще не был помечен
                if (!votes[voteIndex].changedAfterReveal) {
                  votes[voteIndex].changedAfterReveal = true;
                  console.log(
                    `Обнаружено изменение голоса для ${user.name}: ${votes[voteIndex].initialVote} -> ${user.vote}`
                  );
                }
              }

              // Обновляем финальное значение голоса
              votes[voteIndex].finalVote = user.vote;
            } else {
              console.log(
                `Не найден голос в БД для пользователя ${user.name} с ID ${searchUserId}`
              );
            }
          }
        }

        // Обновляем среднюю оценку
        if (gameState.averageVote !== null && gameState.consistency) {
          useSession(currentSession, session => session.set({
            votes,
            averageVote: gameState.averageVote,
            consistency: {
              emoji: gameState.consistency?.emoji || "🤔",
              description: gameState.consistency?.description || "Неизвестная согласованность",
            },
          }));

          await useSession(currentSession, session => session.save());
          const sessionId = useSession(currentSession, session => session._id);
          console.log(
            `Сессия ${sessionId} обновлена с ${votes.filter((v: any) => v.changedAfterReveal).length} изменёнными голосами`
          );

          // Обновляем статистику после пересчета средней оценки
          console.log('Обновляем статистику после пересчета средней оценки');
          if (sessionId) {
            await StatsService.updateVoteChangesStats(sessionId.toString());
          }

          // Обновляем глобальную статистику сразу после обновления статистики пользователей
          console.log('Обновляем глобальную статистику после пересчета');
          await StatsService.recalculateGlobalChangedVotes();
        }
      }

      // Сбрасываем флаги изменений для UI
      gameState.usersChangedVoteAfterReveal = [];
      gameState.users.forEach((user) => {
        user.changedVoteAfterReveal = false;
      });

      io.to(socket.roomCode).emit('game:state', gameState);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Если пользователь был в комнате, обновляем его статус
    if (socket.roomCode) {
      const { gameState } = getRoomSession(socket.roomCode);
      const user = gameState.users.find((u) => u.id === socket.id);
      if (user) {
        user.isOnline = false;
        io.to(socket.roomCode).emit('game:state', gameState);
      }
    }
    
    // Отправляем обновленные данные о количестве пользователей
    broadcastRoomsUsersCount();
  });
});

// Добавить функцию для рассылки обновленной информации о количестве пользователей в комнатах
const broadcastRoomsUsersCount = async () => {
  try {
    const rooms = await RoomService.getAllActiveRooms();
    
    const roomsUsersCount = rooms.reduce((acc, room) => {
      const roomCode = room.code;
      let onlineUsersCount = 0;
      let onlineUsers: string[] = [];
      
      if (roomSessions[roomCode]) {
        const onlineUsersData = roomSessions[roomCode].gameState.users.filter((user: GameStateUser) => user.isOnline);
        onlineUsersCount = onlineUsersData.length;
        onlineUsers = onlineUsersData.map((user: GameStateUser) => user.name);
      }
      
      return {
        ...acc,
        [roomCode]: {
          id: room._id ? room._id.toString() : '',
          code: roomCode,
          onlineUsersCount,
          onlineUsers
        }
      };
    }, {} as Record<string, { id: string, code: string, onlineUsersCount: number, onlineUsers: string[] }>);
    
    io.emit('rooms:usersCount', roomsUsersCount);
  } catch (error) {
    console.error('Ошибка при отправке обновления количества пользователей:', error);
  }
};

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log('🔒 CORS origins:', corsOrigins);

  // Пересчитываем глобальную статистику по изменениям голосов
  StatsService.recalculateGlobalChangedVotes()
    .then(() => console.log('📊 Пересчет глобальной статистики изменённых голосов завершен'))
    .catch((err) => console.error('❌ Ошибка при пересчете статистики:', err));
});
