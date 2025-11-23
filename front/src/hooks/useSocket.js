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
    socket.on('connect', () => {});

    socket.on('disconnect', (reason) => {});

    socket.on('connect_error', (error) => {});

    // Notification event handlers
    socket.on('notification:new', (data) => {
      if (onNewNotification) {
        onNewNotification(data.notification);
      }
    });

    socket.on('notification:update', (data) => {
      if (onNotificationUpdate) {
        onNotificationUpdate(data.notificationId, data.updates);
      }
    });

    socket.on('notification:delete', (data) => {
      if (onNotificationDelete) {
        onNotificationDelete(data.notificationId);
      }
    });

    socket.on('notifications:refresh', () => {
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
      }
    };
  }, [onNewNotification, onNotificationUpdate, onNotificationDelete]);

  return socketRef.current;
};
