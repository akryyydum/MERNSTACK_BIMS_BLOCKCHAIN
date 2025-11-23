import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const useSocket = (onNewNotification, onNotificationUpdate, onNotificationDelete) => {
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection with withCredentials for cookie-based auth
    // The backend socket middleware will read the token from cookies
    socketRef.current = io(API_URL, {
      withCredentials: true, // Send cookies with socket connection
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Notification event handlers
    socket.on('notification:new', (data) => {
      console.log('📨 New notification received:', data);
      if (onNewNotification) {
        onNewNotification(data.notification);
      }
    });

    socket.on('notification:update', (data) => {
      console.log('🔄 Notification updated:', data);
      if (onNotificationUpdate) {
        onNotificationUpdate(data.notificationId, data.updates);
      }
    });

    socket.on('notification:delete', (data) => {
      console.log('🗑️ Notification deleted:', data);
      if (onNotificationDelete) {
        onNotificationDelete(data.notificationId);
      }
    });

    socket.on('notifications:refresh', () => {
      console.log('🔄 Refresh notifications requested');
      // This can trigger a full refresh if needed
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('notification:new');
        socket.off('notification:update');
        socket.off('notification:delete');
        socket.off('notifications:refresh');
        socket.disconnect();
        console.log('🔌 Socket disconnected and cleaned up');
      }
    };
  }, [onNewNotification, onNotificationUpdate, onNotificationDelete]);

  return socketRef.current;
};
