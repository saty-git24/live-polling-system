import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../context/ToastContext';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
}

export function useSocket(): UseSocketReturn {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const toastRef = { add: (m: any) => {} } as any;

  // attempt to use toast context if available at runtime
  try {
    // dynamic import of hook to avoid issues when hook is used outside provider
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // Note: useToast must be used inside a component tree wrapped by ToastProvider
    // We call it here because useSocket is itself a hook used within the tree.
    const t = useToast();
    toastRef.add = t.addToast;
  } catch (e) {
    // no-op if toast provider isn't present yet
  }

  useEffect(() => {
    console.debug('Connecting socket to', SOCKET_URL);
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      setError(null);
      try { toastRef.add && toastRef.add({ type: 'success', message: 'Connected to server' }); } catch (e) {}
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      setError('Connection lost. Attempting to reconnect...');
      try { toastRef.add && toastRef.add({ type: 'error', message: 'Connection lost. Reconnecting...' }); } catch (e) {}
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to server');
      try { toastRef.add && toastRef.add({ type: 'error', message: 'Failed to connect to server' }); } catch (e) {}
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setError(null);
      try { toastRef.add && toastRef.add({ type: 'success', message: 'Reconnected to server' }); } catch (e) {}
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setError('Unable to reconnect. Please refresh the page.');
      try { toastRef.add && toastRef.add({ type: 'error', message: 'Unable to reconnect. Refresh the page.' }); } catch (e) {}
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
  };
}