import { Server } from 'socket.io';

// Создаем экспорт для сокета io
let io: Server | null = null;

export function initializeIO(socketIO: Server) {
  io = socketIO;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO не инициализирован');
  }
  return io;
}

// Экспортируем объект как дефолтный и именованный экспорт для максимальной совместимости
const ioUtils = { initializeIO, getIO };
export default ioUtils; 