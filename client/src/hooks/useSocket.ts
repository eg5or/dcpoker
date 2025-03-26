import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = (token: string | null = null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
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
    };
    
    // Закрываем предыдущий сокет при изменении токена
    closeSocket();
    
    // Не создаем соединение, если нет токена
    if (!token) {
      console.log('Токен отсутствует, соединение не создается');
      setSocket(null);
      return closeSocket;
    }
    
    console.log('Создание нового соединения с токеном');
    
    // Настройки для сокета
    const options = {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      transports: ['websocket']
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
    });
    
    // Функция очистки при размонтировании
    return closeSocket;
  }, [token]); // Добавляем token в зависимости
  
  return socket;
};

export default useSocket;