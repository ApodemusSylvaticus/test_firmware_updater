import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
  visible: boolean;
};

type NotificationStore = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'visible'>) => void;
  removeNotification: (id: string) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = crypto.randomUUID();
    const fullNotification = {
      id,
      visible: true,
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, fullNotification],
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, visible: false } : n)),
      }));
    }, notification.duration ?? 8000);

    setTimeout(
      () => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      (notification.duration ?? 8000) + 300,
    );
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, visible: false } : n)),
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 300);
  },
}));
