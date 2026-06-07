import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV 
    ? `http://${window.location.hostname}:3001` 
    : window.location.origin);

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export function useSocket(): Socket {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) {
      socket.connect();
    }
    return () => {
      // Don't disconnect on unmount — we want to keep the connection
      // across page navigations. Only disconnect when explicitly leaving.
    };
  }, []);

  return socketRef.current;
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}
