import { io, Socket } from 'socket.io-client';
import { authService } from './services/auth.service';

// Определяем URL сервера из переменных окружения
const serverUrl = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : window.location.origin);

// Важно: отладочный лог URL сервера для проверки корректности подключения
console.log('Socket.IO подключение к:', serverUrl);

// Настройки для сокета
const options = {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 5000,
  transports: ['websocket', 'polling'], // Добавляем fallback на polling
  extraHeaders: {
    'Authorization': `Bearer ${authService.getToken()}`
  }
};

// Создаем и экспортируем экземпляр сокета, который можно использовать напрямую
// когда не нужно управлять жизненным циклом сокета через хук
export let socket: Socket = io(serverUrl, options);

// Функция для обновления токена в сокете
export const updateSocketAuth = () => {
  const token = authService.getToken();
  if (token) {
    // Закрываем старое соединение
    if (socket.connected) {
      socket.disconnect();
    }
    
    // Создаем новое соединение с обновленным токеном
    socket = io(serverUrl, {
      ...options,
      auth: { token }
    });
    
    console.log('Сокет обновлен с новым токеном');
  }
};

// Вызываем функцию обновления при загрузке скрипта
updateSocketAuth();

export default socket; 