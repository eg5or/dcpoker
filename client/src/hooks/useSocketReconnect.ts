import { useEffect } from 'react';
import { Socket } from 'socket.io-client';

export const useSocketReconnect = (socket: Socket | null) => {
  useEffect(() => {
    if (!socket) return;

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setTimeout(() => {
        socket.connect();
      }, 1000);
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'transport close' || reason === 'transport error') {
        setTimeout(() => {
          socket.connect();
        }, 1000);
      }
    };

    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);
}; 