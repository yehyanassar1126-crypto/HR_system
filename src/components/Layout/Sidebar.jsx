import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { getInitials } from '../../utils/helpers';
import {
  LayoutDashboard, Users, CalendarCheck, Clock, CalendarDays, DollarSign,
  Megaphone, BarChart3, FileText, QrCode, Bell, Settings, LogOut, Factory,
  Timer,
} from 'lucide-react';

const hrMenuItems = [
  { section: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Management', items: [
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarDays },
    { id: 'shifts', label: 'Shift Management', icon: Clock },
    { id: 'overtime', label: 'Overtime', icon: Timer },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
  ]},
  { section: 'Communication', items: [
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ]},
  { section: 'Analytics', items: [
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'audit-log', label: 'Audit Log', icon: FileText },
  ]},
];

const empMenuItems = [
  { section: 'Overview', items: [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'My Info', items: [
    { id: 'my-attendance', label: 'My Attendance', icon: CalendarCheck },
    { id: 'qr-checkin', label: 'QR Check-In', icon: QrCode },
    { id: 'my-leaves', label: 'My Leaves', icon: CalendarDays },
    { id: 'my-salary', label: 'My Salary', icon: DollarSign },
    { id: 'my-overtime', label: 'My Overtime', icon: Timer },
  ]},
  { section: 'Other', items: [
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ]},
];

export default function Sidebar({ activePage, setActivePage }) {
  const { user, logout, isHR } = useAuth();
  const { unreadCount } = useNotifications();
  const menuItems = isHR ? hrMenuItems : empMenuItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Factory size={20} color="white" />
        </div>
        <div className="sidebar-brand">
          <h2>Smart Factory</h2>
          <p>HR Management</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((section) => (
          <div key={section.section} className="sidebar-section">
            <div className="sidebar-section-title">{section.section}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => setActivePage(item.id)}
                  id={`nav-${item.id}`}
                >
                  <Icon size={18} className="sidebar-item-icon" />
                  <span>{item.label}</span>
                  {item.id === 'leaves' && isHR && unreadCount > 0 && (
                    <span className="sidebar-item-badge">{unreadCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ background: user?.avatar_color || '#6366f1' }}>
            {getInitials(user?.full_name)}
          </div>
          <div className="sidebar-user-info">
            <h4>{user?.full_name}</h4>
            <p>{user?.position}</p>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Sign out" id="logout-btn">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
