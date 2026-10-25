import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api.js';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  terminalId: string;
  setTerminalId: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [terminalId, setTerminalId] = useState('TERM-CL304');

  useEffect(() => {
    // Socket connects dynamically via LAN IP or configured host
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Connected to ORCHESTRA Telemetry Server:', socketInstance.id);
      setIsConnected(true);
      socketInstance.emit('join:terminal', terminalId);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from Telemetry Server');
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [terminalId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, terminalId, setTerminalId }}>
      {children}
    </SocketContext.Provider>
  );
};

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
