import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server, Socket } from 'socket.io';
import { connectDB } from './config/db.js';
import { verifyToken } from './config/jwt.js';
import { VotingSession } from './models/session.model.js';
import { User } from './models/user.model.js';
import authRoutes from './routes/auth.routes.js';
import statsRoutes from './routes/stats.routes.js';
import { StatsService } from './services/stats.service.js';
import { initializeIO } from './utils/io.js';

// Загружаем переменные окружения
dotenv.config();

// Подключаемся к базе данных
connectDB();

const app = express();
const httpServer = createServer(app);

// Получаем origins из env и преобразуем в массив
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"];

// Настройка middleware для Express
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем маршруты аутентификации
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: parseInt(process.env.PING_TIMEOUT || '10000'),
  pingInterval: parseInt(process.env.PING_INTERVAL || '5000')
});

// Инициализируем io для использования в других модулях
initializeIO(io);

// Определяем интерфейс для сокета с пользовательскими данными
interface AuthenticatedSocket extends Socket {
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
          name: user.username
        };
      }
    } catch (error) {
      console.error('Ошибка при проверке пользователя:', error);
    }
  }
  
  next();
});

// Типизируем документ MongoDB для правильной работы с ID и параметрами
type VotingSessionDocument = {
  _id: mongoose.Types.ObjectId;
  get: (name: string) => any;
  set: (data: any) => void;
  save: () => Promise<any>;
};

// Текущая активная сессия голосования
let currentSession: VotingSessionDocument | null = null;

// Функция для создания новой сессии голосования
async function createOrUpdateVotingSession(initialCreatorId?: string): Promise<VotingSessionDocument> {
  try {
    // Если текущая сессия не существует, создаем новую
    if (!currentSession) {
      const creatorId = initialCreatorId 
        ? new mongoose.Types.ObjectId(initialCreatorId)
        : new mongoose.Types.ObjectId();
      
      currentSession = await VotingSession.create({
        createdBy: creatorId,
        title: `Сессия ${new Date().toLocaleString()}`,
        status: 'active',
        participants: [],
        votes: [],
        emojis: [],
        wasRevealed: false,
        createdAt: new Date()
      }) as unknown as VotingSessionDocument;
      
      console.log('Создана новая сессия голосования:', currentSession._id);
    }
    
    return currentSession;
  } catch (error) {
    console.error('Ошибка при создании/обновлении сессии голосования:', error);
    throw error;
  }
}

// Обновляет текущую сессию при раскрытии карт
async function updateSessionOnReveal(): Promise<void> {
  if (!currentSession) {
    console.error('Нет текущей сессии для обновления при раскрытии карт');
    return;
  }

  try {
    const votes = [];
    
    // Собираем актуальные голоса для сессии
    for (const user of gameState.users) {
      if (user.vote !== null) {
        let userId: string | mongoose.Types.ObjectId = user.id;
        
        // Если пользователь аутентифицирован, используем его MongoDB ID
        const socket = Array.from(io.sockets.sockets.values())
          .find(s => (s as any).id === user.id) as AuthenticatedSocket | undefined;
        
        if (socket?.user?.id) {
          userId = new mongoose.Types.ObjectId(socket.user.id);
        }
        
        votes.push({
          userId,
          username: user.name,
          initialVote: user.vote,
          finalVote: user.vote,
          changedAfterReveal: false,
          votedAt: new Date()
        });
      }
    }
    
    // Обновляем поля сессии
    currentSession.set({
      wasRevealed: true,
      votes,
      averageVote: gameState.averageVote,
      consistency: gameState.consistency,
      revealedAt: new Date()
    });
    
    await currentSession.save();
    console.log('Сессия обновлена при раскрытии карт:', currentSession._id);
    
    // Обновляем статистику сессии для увеличения общего количества голосований
    await StatsService.updateSessionStats(currentSession._id.toString());
    
    // Обновляем глобальную статистику для гарантии актуальных данных
    await StatsService.recalculateGlobalChangedVotes();
  } catch (error) {
    console.error('Ошибка при обновлении сессии после раскрытия карт:', error);
  }
}

// Функция для завершения текущей сессии
async function completeCurrentSession() {
  try {
    if (!currentSession) return;
    
    // Обновляем статус сессии на "завершено"
    currentSession.set({
      status: 'completed',
      completedAt: new Date()
    });
    
    // Обновляем голоса, если они изменились после раскрытия
    if (gameState.usersChangedVoteAfterReveal.length > 0) {
      const votes = currentSession.get('votes') || [];
      
      for (const user of gameState.users) {
        if (user.changedVoteAfterReveal && user.vote !== null) {
          // Безопасный поиск индекса - проверяем существование userId и метода toString()
          const voteIndex = votes.findIndex((v: any) => {
            if (!v || !v.userId) return false;
            
            // Проверяем, что можно безопасно вызвать toString() или сравнить напрямую
            if (typeof v.userId === 'string') {
              return v.userId === user.id;
            } else if (v.userId.toString) {
              return v.userId.toString() === user.id;
            }
            return false;
          });
          
          if (voteIndex !== -1) {
            votes[voteIndex].finalVote = user.vote;
            votes[voteIndex].changedAfterReveal = true;
          }
        }
      }
      
      currentSession.set({ votes });
    }
    
    await currentSession.save();
    
    // При завершении сессии обновляем статус завершенных сессий
    console.log(`Обновление статуса завершения для сессии ${currentSession._id}`);
    await StatsService.updateCompletedSessionStats(currentSession._id.toString());
    
    // Сбрасываем текущую сессию
    currentSession = null;
    
    console.log('Завершена сессия голосования');
  } catch (error) {
    console.error('Ошибка при завершении сессии голосования:', error);
  }
}

type User = {
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

type GameState = {
  users: User[];
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
  consistency: null
};

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log('User connected:', socket.id);

  socket.emit('game:state', gameState);

  socket.on('user:join', async (name: string) => {
    console.log('User joining:', socket.id, name);
    
    // Создаем или получаем текущую сессию
    if (socket.user && socket.user.id) {
      await createOrUpdateVotingSession(socket.user.id);
      
      // Добавляем пользователя в список участников сессии, если его там еще нет
      if (currentSession) {
        const participants = currentSession.get('participants') || [];
        const userId = new mongoose.Types.ObjectId(socket.user.id);
        
        if (!participants.some((p: mongoose.Types.ObjectId) => p.toString() === userId.toString())) {
          participants.push(userId);
          currentSession.set({ participants });
          await currentSession.save();
        }
      }
    }
    
    const existingUser = gameState.users.find(u => u.name === name);
    if (existingUser) {
      existingUser.id = socket.id;
      existingUser.isOnline = true;
      existingUser.vote = null;
      existingUser.changedVoteAfterReveal = false;
      existingUser.joinedAt = Date.now();
      existingUser.emojiAttacks = {};
    } else {
      const user: User = {
        id: socket.id,
        name,
        isOnline: true,
        vote: null,
        changedVoteAfterReveal: false,
        joinedAt: Date.now(),
        emojiAttacks: {}
      };
      gameState.users.push(user);
    }
    
    console.log('Current users:', gameState.users);
    io.emit('game:state', gameState);
  });

  socket.on('user:vote', (value: number) => {
    console.log('Vote received:', socket.id, value);
    const user = gameState.users.find(u => u.id === socket.id);
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
    calculateAverageVote();
    
    // Обновляем сессию и статистику при раскрытии карт
    await updateSessionOnReveal();
    
    io.emit('game:state', gameState);
  });

  socket.on('throw:emoji', async (targetUserId: string, emoji: string, placement: { x: number, y: number, rotation: number }) => {
    console.log('Received throw:emoji event:', { targetUserId, emoji, placement });
    const targetUser = gameState.users.find(u => u.id === targetUserId);
    const fromUser = gameState.users.find(u => u.id === socket.id);
    
    if (targetUser && fromUser && targetUser.id !== fromUser.id) {
      console.log('Users found:', { targetUser: targetUser.name, fromUser: fromUser.name });
      
      // Инициализируем объект, если он не существует
      if (!targetUser.emojiAttacks) {
        targetUser.emojiAttacks = {};
      }
      
      // Увеличиваем счетчик для данного эмодзи
      targetUser.emojiAttacks[emoji] = (targetUser.emojiAttacks[emoji] || 0) + 1;
      
      // Генерируем случайную траекторию
      const side = Math.floor(Math.random() * 4);
      let startX, startY;
      
      switch(side) {
        case 0:
          startX = Math.random() * 100;
          startY = -10;
          break;
        case 1:
          startX = 110;
          startY = Math.random() * 100;
          break;
        case 2:
          startX = Math.random() * 100;
          startY = 110;
          break;
        case 3:
          startX = -10;
          startY = Math.random() * 100;
          break;
      }

      const trajectory = {
        startX,
        startY,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 20 + 40
      };

      const throwTime = Date.now();

      console.log('Emitting emoji:thrown event:', {
        targetId: targetUser.id,
        fromId: fromUser.id,
        emoji,
        trajectory,
        placement,
        throwTime
      });

      io.emit('emoji:thrown', targetUser.id, fromUser.id, emoji, trajectory, throwTime, placement);
      
      // Записываем событие броска эмодзи в текущую сессию
      if (currentSession && socket.user && socket.user.id) {
        const emojis = currentSession.get('emojis') || [];
        
        // Создаем запись с данными о брошенном эмодзи
        const emojiRecord = {
          senderId: new mongoose.Types.ObjectId(socket.user.id),  // ID аутентифицированного пользователя
          targetId: targetUser.id,  // ID целевого пользователя (ID сокета)
          senderName: fromUser.name,
          targetName: targetUser.name,
          emoji,
          thrownAt: new Date()
        };
        
        emojis.push(emojiRecord);
        
        currentSession.set({ emojis });
        await currentSession.save();
        
        // Обновляем статистику эмодзи для отправителя
        try {
          // Проверяем, аутентифицирован ли получатель
          const targetSocketUser = Array.from(io.sockets.sockets.values())
            .find(s => (s as any).id === targetUser.id && (s as any).user?.id) as AuthenticatedSocket | undefined;
          
          // ID получателя: либо ID аутентифицированного пользователя, либо ID сокета
          const targetUserId = targetSocketUser?.user?.id || targetUser.id;
          
          // Обновляем статистику с правильными ID отправителя и получателя
          await StatsService.updateEmojiStats(socket.user.id, targetUserId, emoji);
          
          console.log(`Статистика эмодзи обновлена: от ${socket.user.id} к ${targetUserId}`);
        } catch (error) {
          console.error('Ошибка при обновлении статистики эмодзи:', error);
        }
      }
      
      io.emit('game:state', gameState);
    } else {
      console.log('Users not found or same user:', {
        targetFound: !!targetUser,
        fromFound: !!fromUser,
        isSameUser: targetUser?.id === fromUser?.id
      });
    }
  });

  socket.on('game:reset', async () => {
    // Завершаем текущую сессию перед сбросом
    await completeCurrentSession();
    
    const resetTime = Date.now();
    // Сбрасываем состояние игры
    gameState.users.forEach(user => {
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
      await createOrUpdateVotingSession(socket.user.id);
    }
    
    // Отправляем обновленное состояние с временем сброса
    io.emit('game:state', { ...gameState, resetTime });
    
    // После обновления состояния отправляем сигнал для анимации падения
    io.emit('emojis:fall', resetTime);
  });

  socket.on('emojis:shake', (userId: string) => {
    // Проверяем, что пользователь пытается оттряхнуть свою карточку
    if (socket.id === userId) {
      const shakeTime = Date.now();
      const user = gameState.users.find(u => u.id === userId);
      if (user) {
        user.lastShakeTime = shakeTime;
        
        // Подсчитываем общее количество эмодзи на карточке
        const totalEmojis = Object.values(user.emojiAttacks || {}).reduce((sum, count) => sum + count, 0);
        
        if (totalEmojis > 0) {
          // Создаем массив всех возможных индексов
          const allIndices = Array.from({ length: totalEmojis }, (_, i) => i);
          
          // Перемешиваем индексы случайным образом
          const shuffledIndices = [...allIndices].sort(() => Math.random() - 0.5);
          
          // Определяем, какие эмодзи должны упасть (вероятность 70-95%)
          const fallingIndices = shuffledIndices.filter(() => {
            const baseChance = 0.7;  // Базовый шанс падения 70%
            const randomBonus = Math.random() * 0.25;  // Дополнительный бонус до 25%
            const totalChance = baseChance + randomBonus;
            return Math.random() < totalChance;
          });
          
          console.log(`Server decided ${fallingIndices.length} out of ${totalEmojis} emojis should fall for user ${user.name}`);
          
          // Отправляем всем клиентам индексы падающих эмодзи
          io.emit('emojis:shake', userId, shakeTime, fallingIndices);
        } else {
          // Если эмодзи нет, просто отправляем основное событие
          io.emit('emojis:shake', userId, shakeTime, []);
        }
        
        io.emit('game:state', gameState); // Отправляем обновленное состояние
      }
    }
  });

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
      calculateAverageVote();
      
      // Обновляем сессию с новыми данными по изменённым голосам
      if (currentSession) {
        const votes = currentSession.get('votes') || [];
        let hasChangedVotes = false;
        
        // Обновляем финальные голоса и помечаем изменённые
        for (const user of gameState.users) {
          if (user.vote !== null) {
            // Определяем userId для поиска в базе данных
            let searchUserId: string | mongoose.Types.ObjectId = user.id;
            
            // Если пользователь аутентифицирован, используем его MongoDB ID
            const userSocket = Array.from(io.sockets.sockets.values())
              .find(s => (s as any).id === user.id) as AuthenticatedSocket | undefined;
            
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
                  hasChangedVotes = true;
                  console.log(`Обнаружено изменение голоса для ${user.name}: ${votes[voteIndex].initialVote} -> ${user.vote}`);
                }
              }
              
              // Обновляем финальное значение голоса
              votes[voteIndex].finalVote = user.vote;
            } else {
              console.log(`Не найден голос в БД для пользователя ${user.name} с ID ${searchUserId}`);
            }
          }
        }
        
        // Обновляем среднюю оценку
        if (gameState.averageVote !== null && gameState.consistency) {
          currentSession.set({
            votes,
            averageVote: gameState.averageVote,
            consistency: {
              emoji: gameState.consistency.emoji,
              description: gameState.consistency.description
            }
          });
          
          await currentSession.save();
          console.log(`Сессия ${currentSession._id} обновлена с ${votes.filter((v: any) => v.changedAfterReveal).length} изменёнными голосами`);
          
          // Обновляем статистику после пересчета средней оценки
          console.log('Обновляем статистику после пересчета средней оценки');
          await StatsService.updateVoteChangesStats(currentSession._id.toString());
          
          // Обновляем глобальную статистику сразу после обновления статистики пользователей
          console.log('Обновляем глобальную статистику после пересчета');
          await StatsService.recalculateGlobalChangedVotes();
        }
      }
      
      // Сбрасываем флаги изменений для UI
      gameState.usersChangedVoteAfterReveal = [];
      gameState.users.forEach(user => {
        user.changedVoteAfterReveal = false;
      });
      
      io.emit('game:state', gameState);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const user = gameState.users.find(u => u.id === socket.id);
    if (user) {
      user.isOnline = false;
      io.emit('game:state', gameState);
    }
  });
});

function calculateAverageVote() {
  const votes = gameState.users
    .filter(u => u.vote !== null && u.isOnline)
    .map(u => u.vote as number);
  
  if (votes.length === 0) {
    gameState.averageVote = null;
    gameState.consistency = null;
    return;
  }

  // Считаем среднее с точностью до десятых
  const average = votes.reduce((a, b) => a + b, 0) / votes.length;
  gameState.averageVote = Math.round(average * 10) / 10;

  // Считаем стандартное отклонение
  const variance = votes.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / votes.length;
  const stdDev = Math.sqrt(variance);
  
  // Коэффициент вариации (CV) - отношение стандартного отклонения к среднему
  const cv = (stdDev / average) * 100;

  // Определяем согласованность на основе коэффициента вариации
  if (cv === 0) {
    gameState.consistency = {
      emoji: "🤩",
      description: "Полное единогласие!"
    };
  } else if (cv <= 15) {
    gameState.consistency = {
      emoji: "😊",
      description: "Отличная согласованность"
    };
  } else if (cv <= 30) {
    gameState.consistency = {
      emoji: "🙂",
      description: "Хорошая согласованность"
    };
  } else if (cv <= 50) {
    gameState.consistency = {
      emoji: "😕",
      description: "Средняя согласованность"
    };
  } else {
    gameState.consistency = {
      emoji: "😬",
      description: "Большой разброс мнений"
    };
  }
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS origins:', corsOrigins);
  
  // Пересчитываем глобальную статистику по изменениям голосов
  StatsService.recalculateGlobalChangedVotes()
    .then(() => console.log('Пересчет глобальной статистики изменённых голосов завершен'))
    .catch(err => console.error('Ошибка при пересчете статистики:', err));
}); 