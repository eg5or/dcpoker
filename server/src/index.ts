import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Получаем origins из env и преобразуем в массив
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"];

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  },
  pingTimeout: parseInt(process.env.PING_TIMEOUT || '10000'),
  pingInterval: parseInt(process.env.PING_INTERVAL || '5000')
});

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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.emit('game:state', gameState);

  socket.on('user:join', (name: string) => {
    console.log('User joining:', socket.id, name);
    
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

  socket.on('votes:reveal', () => {
    gameState.isRevealed = true;
    calculateAverageVote();
    io.emit('game:state', gameState);
  });

  socket.on('throw:emoji', (targetUserId: string, emoji: string) => {
    console.log('Received throw:emoji event:', { targetUserId, emoji });
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
      const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let startX, startY;
      
      switch(side) {
        case 0: // сверху
          startX = Math.random() * 100;
          startY = -10;
          break;
        case 1: // справа
          startX = 110;
          startY = Math.random() * 100;
          break;
        case 2: // снизу
          startX = Math.random() * 100;
          startY = 110;
          break;
        case 3: // слева
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

      console.log('Emitting emoji:thrown event:', {
        targetId: targetUser.id,
        fromId: fromUser.id,
        emoji,
        trajectory
      });

      io.emit('emoji:thrown', targetUser.id, fromUser.id, emoji, trajectory);
      io.emit('game:state', gameState);
    } else {
      console.log('Users not found or same user:', {
        targetFound: !!targetUser,
        fromFound: !!fromUser,
        isSameUser: targetUser?.id === fromUser?.id
      });
    }
  });

  socket.on('game:reset', () => {
    gameState.users.forEach(user => {
      user.vote = null;
      user.changedVoteAfterReveal = false;
      user.emojiAttacks = {};
    });
    gameState.isRevealed = false;
    gameState.averageVote = null;
    gameState.usersChangedVoteAfterReveal = [];
    io.emit('game:state', gameState);
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

  socket.on('recalculate:average', () => {
    if (gameState.isRevealed) {
      calculateAverageVote();
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
}); 