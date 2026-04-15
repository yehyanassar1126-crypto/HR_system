import { useNotifications } from '../../contexts/NotificationContext';
import { Bell, Search } from 'lucide-react';

const pageTitles = {
  'dashboard': { title: 'Dashboard', sub: 'Overview & Analytics' },
  'employees': { title: 'Employee Management', sub: 'Manage all employees' },
  'attendance': { title: 'Attendance', sub: 'Track employee attendance' },
  'leaves': { title: 'Leave Management', sub: 'Handle leave requests' },
  'shifts': { title: 'Shift Management', sub: 'Morning, Evening & Night shifts' },
  'overtime': { title: 'Overtime Management', sub: 'Track & approve overtime' },
  'payroll': { title: 'Payroll', sub: 'Salary processing & reports' },
  'announcements': { title: 'Announcements', sub: 'Company-wide messages' },
  'reports': { title: 'Reports & Analytics', sub: 'Insights & data export' },
  'audit-log': { title: 'Audit Log', sub: 'System activity tracking' },
  'my-attendance': { title: 'My Attendance', sub: 'Your attendance records' },
  'qr-checkin': { title: 'QR Check-In / Out', sub: 'Scan to check in or out' },
  'my-leaves': { title: 'My Leaves', sub: 'Your leave requests' },
  'my-salary': { title: 'My Salary', sub: 'Your salary details' },
  'my-overtime': { title: 'My Overtime', sub: 'Your overtime records' },
};

export default function Header({ activePage }) {
  const { unreadCount, setShowPanel } = useNotifications();
  const page = pageTitles[activePage] || { title: 'Dashboard', sub: '' };

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-title">
          <h2>{page.title}</h2>
          <p>{page.sub}</p>
        </div>
      </div>
      <div className="header-right">
        <button
          className="header-btn"
          onClick={() => setShowPanel(true)}
          title="Notifications"
          id="notif-toggle"
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </div>
    </header>
  );
}
