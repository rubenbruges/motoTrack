import { useState } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (type: NotificationType, message: string, duration = 5000) => {
    const id = Date.now().toString();
    const notification: Notification = { id, type, message, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const success = (message: string, duration?: number) => showNotification('success', message, duration);
  const error = (message: string, duration?: number) => showNotification('error', message, duration);
  const warning = (message: string, duration?: number) => showNotification('warning', message, duration);
  const info = (message: string, duration?: number) => showNotification('info', message, duration);

  return {
    notifications,
    showNotification,
    removeNotification,
    success,
    error,
    warning,
    info
  };
}