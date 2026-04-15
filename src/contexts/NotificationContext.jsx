import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { mockNotifications } from '../utils/mockData';
import { isDemoMode, supabase } from '../supabaseClient';

const NotificationContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }

    if (isDemoMode) {
      setNotifications(mockNotifications.filter(n => n.user_id === user.id));
    } else {
      loadNotifications();
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  };

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!isDemoMode) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (!isDemoMode && user) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    }
  }, [user]);

  const addNotification = useCallback(async (notification) => {
    const newNotif = {
      id: Date.now().toString(),
      read: false,
      created_at: new Date().toISOString(),
      ...notification,
    };
    if (notification.user_id === user?.id) {
      setNotifications(prev => [newNotif, ...prev]);
    }
    if (!isDemoMode) {
      await supabase.from('notifications').insert(notification);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, showPanel, setShowPanel,
      markAsRead, markAllRead, addNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
