import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // В Docker Compose сервер будет доступен по имени сервиса
    const socketInstance = io(window.location.origin, {
      path: '/socket.io'
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return socket;
}