import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './components/Auth/LoginPage';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import NotificationPanel from './components/Notifications/NotificationPanel';
import HRDashboard from './components/Dashboard/HRDashboard';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import EmployeeList from './components/Employees/EmployeeList';
import AttendanceLog from './components/Attendance/AttendanceLog';
import QRCheckin from './components/Attendance/QRCheckin';
import LeaveManagement from './components/Leave/LeaveManagement';
import ShiftManagement from './components/Shifts/ShiftManagement';
import OvertimeManagement from './components/Overtime/OvertimeManagement';
import PayrollDashboard from './components/Payroll/PayrollDashboard';
import Announcements from './components/Announcements/Announcements';
import Reports from './components/Reports/Reports';
import AuditLog from './components/AuditLog/AuditLog';
import './index.css';

function AppContent() {
  const { user, loading, isHR } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', flexDirection: 'column', gap: 16,
      }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return isHR
          ? <HRDashboard setActivePage={setActivePage} />
          : <EmployeeDashboard setActivePage={setActivePage} />;
      case 'employees':
        return isHR ? <EmployeeList /> : <EmployeeDashboard setActivePage={setActivePage} />;
      case 'attendance':
      case 'my-attendance':
        return <AttendanceLog />;
      case 'qr-checkin':
        return <QRCheckin />;
      case 'leaves':
      case 'my-leaves':
        return <LeaveManagement />;
      case 'shifts':
        return isHR ? <ShiftManagement /> : <EmployeeDashboard setActivePage={setActivePage} />;
      case 'overtime':
      case 'my-overtime':
        return <OvertimeManagement />;
      case 'payroll':
      case 'my-salary':
        return <PayrollDashboard />;
      case 'announcements':
        return <Announcements />;
      case 'reports':
        return isHR ? <Reports /> : <EmployeeDashboard setActivePage={setActivePage} />;
      case 'audit-log':
        return isHR ? <AuditLog /> : <EmployeeDashboard setActivePage={setActivePage} />;
      default:
        return isHR
          ? <HRDashboard setActivePage={setActivePage} />
          : <EmployeeDashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <NotificationProvider>
      <div className="app-layout">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <div className="main-content">
          <Header activePage={activePage} />
          <div className="page-content">
            {renderPage()}
          </div>
        </div>
        <NotificationPanel />
      </div>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
