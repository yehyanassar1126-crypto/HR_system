import { useNotifications } from '../../contexts/NotificationContext';
import { formatDateTime } from '../../utils/helpers';
import { X, Bell, BellOff, CheckCheck } from 'lucide-react';

export default function NotificationPanel() {
  const { notifications, showPanel, setShowPanel, markAsRead, markAllRead, unreadCount } = useNotifications();

  if (!showPanel) return null;

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 99
      }} onClick={() => setShowPanel(false)} />
      <div className="notif-panel">
        <div className="notif-panel-header">
          <h3>🔔 Notifications</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button className="btn btn-xs btn-outline" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button className="modal-close" onClick={() => setShowPanel(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="notif-panel-body">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <BellOff size={40} />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="notif-item-title">{n.title}</div>
                <div className="notif-item-msg">{n.message}</div>
                <div className="notif-item-time">{formatDateTime(n.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
