import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import { connectDB } from './config/db.js';
import { verifyToken } from './config/jwt.js';
import { User } from './models/user.model.js';
import authRoutes from './routes/auth.routes.js';
import statsRoutes from './routes/stats.routes.js';
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

// Подключаемся к базе данных
connectDB();

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

// Подключаем маршруты аутентификации
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

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

// Текущая активная сессия голосования
let currentSession: VotingSessionDocument | null = null;

// Функция для безопасной работы с сессией
export function useSession<T>(session: VotingSessionDocument | null, callback: (session: VotingSessionDocument) => T): T | null {
  if (!session) return null;
  return callback(session as VotingSessionDocument);
}

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

const gameState: GameState = {
  users: [],
  isRevealed: false,
  averageVote: null,
  usersChangedVoteAfterReveal: [],
  consistency: null,
};

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log('User connected:', socket.id);

  socket.emit('game:state', gameState);

  socket.on('user:join', async (name: string) => {
    console.log('User joining:', socket.id, name);

    // Создаем или получаем текущую сессию
    if (socket.user && socket.user.id) {
      currentSession = await createOrUpdateVotingSession(currentSession, socket.user.id);

      // Добавляем пользователя в список участников сессии, если его там еще нет
      if (currentSession) {
        const participants = useSession(currentSession, session => session.get('participants')) || [];
        const userId = new mongoose.Types.ObjectId(socket.user.id);

        if (
          !participants.some((p: mongoose.Types.ObjectId) => p.toString() === userId.toString())
        ) {
          participants.push(userId);
          useSession(currentSession, session => session.set({ participants }));
          await useSession(currentSession, session => session.save());
        }
      }
    }

    const existingUser = gameState.users.find((u) => u.name === name);
    if (existingUser) {
      existingUser.id = socket.id;
      existingUser.isOnline = true;
      existingUser.vote = null;
      existingUser.changedVoteAfterReveal = false;
      existingUser.joinedAt = Date.now();
      existingUser.emojiAttacks = {};
    } else {
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

    console.log('Current users:', gameState.users);
    io.emit('game:state', gameState);
  });

  socket.on('user:vote', (value: number) => {
    console.log('Vote received:', socket.id, value);
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
      io.emit('game:state', gameState);
    } else {
      console.log('User not found:', socket.id);
    }
  });

  socket.on('votes:reveal', async () => {
    gameState.isRevealed = true;
    calculateAverageVote(gameState);

    // Обновляем сессию и статистику при раскрытии карт
    await updateSessionOnReveal(currentSession, gameState, io);

    io.emit('game:state', gameState);
  });

  socket.on(
    'throw:emoji',
    async (targetUserId: string,
      emoji: string,
      placement: { x: number; y: number; rotation: number }) => await throwEmoji(targetUserId, emoji, placement, gameState, io, socket, currentSession)
  );

  socket.on('game:reset', async () => {
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
      await createOrUpdateVotingSession(currentSession, socket.user.id);
    }

    // Отправляем обновленное состояние с временем сброса
    io.emit('game:state', { ...gameState, resetTime });

    // После обновления состояния отправляем сигнал для анимации падения
    io.emit('emojis:fall', resetTime);
  });

  socket.on('emojis:shake', async (userId: string) => await emojisShake(userId, gameState, io, socket));

  socket.on('users:reset', () => {
    // Очищаем список пользователей
    gameState.users = [];
    gameState.isRevealed = false;
    gameState.averageVote = null;
    gameState.usersChangedVoteAfterReveal = [];
    gameState.consistency = null;

    // Отправляем всем клиентам команду на разлогинивание
    io.emit('force:logout');
    // Отправляем обновленное состояние
    io.emit('game:state', gameState);
  });

  socket.on('recalculate:average', async () => {
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

      io.emit('game:state', gameState);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const user = gameState.users.find((u) => u.id === socket.id);
    if (user) {
      user.isOnline = false;
      io.emit('game:state', gameState);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS origins:', corsOrigins);

  // Пересчитываем глобальную статистику по изменениям голосов
  StatsService.recalculateGlobalChangedVotes()
    .then(() => console.log('Пересчет глобальной статистики изменённых голосов завершен'))
    .catch((err) => console.error('Ошибка при пересчете статистики:', err));
});
