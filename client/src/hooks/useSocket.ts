import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = (token: string | null = null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  
  // Сбрасываем флаг ошибки, если токен изменился
  useEffect(() => {
    if (token) {
      setConnectionFailed(false);
    }
  }, [token]);
  
  useEffect(() => {
    // Функция для закрытия сокета
    const closeSocket = () => {
      if (socketRef.current) {
        console.log('Закрытие предыдущего соединения...');
        // Удаляем все слушатели перед отключением
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      // Очищаем таймаут, если он был установлен
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
    
    // Закрываем предыдущий сокет при изменении токена
    closeSocket();
    
    // Не создаем соединение, если нет токена
    if (!token) {
      console.log('Токен отсутствует, соединение не создается');
      setSocket(null);
      // Устанавливаем флаг соединения "неудачно", только если соединение не было установлено ранее
      if (!socketRef.current) {
        setConnectionFailed(true);
      }
      return closeSocket;
    }
    
    console.log('Создание нового соединения с токеном');
    
    // Устанавливаем таймаут для сброса состояния подключения, если не удалось подключиться
    connectionTimeoutRef.current = window.setTimeout(() => {
      console.log('Превышено время ожидания подключения');
      setConnectionFailed(true);
    }, 5000); // 5 секунд на подключение
    
    // Настройки для сокета
    const options = {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
      transports: ['websocket', 'polling'] // Добавляем fallback на polling
    };
    
    // Определяем URL сервера
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : window.location.origin;
    
    // Создаем новое соединение
    const newSocket = io(serverUrl, options);
    socketRef.current = newSocket;
    
    // Добавляем обработчики событий
    newSocket.on('connect', () => {
      console.log('Соединение установлено, ID:', newSocket.id);
      // Очищаем таймаут при успешном подключении
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      console.log('Сбрасываем флаг ошибки подключения при успешном соединении');
      setConnectionFailed(false);
      setSocket(newSocket);
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Соединение закрыто, причина:', reason);
      if (reason === 'io server disconnect') {
        console.log('Сервер закрыл соединение, попытка переподключения...');
        newSocket.connect();
      }
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Ошибка подключения:', error.message);
      // Устанавливаем флаг после нескольких попыток
      if (connectionTimeoutRef.current) {
        window.clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      // Для некоторых типов ошибок сразу устанавливаем флаг неудачного подключения
      if (error.message.includes('jwt') || error.message.includes('auth')) {
        console.log('Ошибка аутентификации:', error.message);
        setConnectionFailed(true);
      }
    });
    
    // Функция очистки при размонтировании
    return closeSocket;
  }, [token]); // Добавляем token в зависимости
  
  // Возвращаем и сокет, и флаг ошибки подключения
  return { socket, connectionFailed };
};

export default useSocket;