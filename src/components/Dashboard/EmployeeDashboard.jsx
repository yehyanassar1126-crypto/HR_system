import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockAttendance, mockLeaves, mockPayroll, mockOvertime, mockAnnouncements } from '../../utils/mockData';
import { supabase, isDemoMode } from '../../supabaseClient';
import { SHIFTS } from '../../utils/constants';
import { formatDate, formatDateTime, formatTime, calculateInsuranceDuration, getInitials } from '../../utils/helpers';
import {
  CalendarCheck, Clock, DollarSign, Shield, Calendar, Timer,
  ArrowRight, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';

export default function EmployeeDashboard({ setActivePage }) {
  const { user } = useAuth();
  
  const [myAttendance, setMyAttendance] = useState(mockAttendance.filter(a => a.employee_id === user.id));
  const [myLeaves, setMyLeaves] = useState(mockLeaves.filter(l => l.employee_id === user.id));
  const [myPayroll, setMyPayroll] = useState(mockPayroll.filter(p => p.employee_id === user.id));
  const [myOvertime, setMyOvertime] = useState(mockOvertime.filter(o => o.employee_id === user.id));
  const [announcements, setAnnouncements] = useState(mockAnnouncements);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchData = async () => {
      const [attRes, leaveRes, payRes, otRes, annRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('employee_id', user.id),
        supabase.from('leave_requests').select('*').eq('employee_id', user.id),
        supabase.from('payroll').select('*').eq('employee_id', user.id).order('month', { ascending: false }),
        supabase.from('overtime').select('*').eq('employee_id', user.id),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
      ]);
      
      if (attRes.data) setMyAttendance(attRes.data);
      if (leaveRes.data) setMyLeaves(leaveRes.data);
      if (payRes.data) setMyPayroll(payRes.data);
      if (otRes.data) setMyOvertime(otRes.data);
      if (annRes.data) setAnnouncements(annRes.data);
    };
    fetchData();
  }, [isDemoMode, user.id]);

  const todayAttendance = myAttendance.find(a => a.date === new Date().toISOString().split('T')[0]);
  const pendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
  const latestPay = myPayroll[0]; // because we ordered by month desc
  const insurance = calculateInsuranceDuration(user.insurance_start);
  const shift = SHIFTS[user.shift];

  return (
    <div>
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar" style={{ background: user.avatar_color }}>
          {getInitials(user.full_name)}
        </div>
        <div className="profile-info">
          <h2>Welcome back, {user.full_name.split(' ')[0]}! 👋</h2>
          <div className="profile-meta">
            <span>🏢 {user.department}</span>
            <span>💼 {user.position}</span>
            <span>🆔 {user.employee_id}</span>
            <span className={`shift-badge shift-${user.shift}`}>
              <Clock size={12} /> {shift?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': todayAttendance ? '#22c55e' : '#f59e0b', cursor: 'pointer' }} onClick={() => setActivePage('my-attendance')}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: todayAttendance ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }}>
              <CalendarCheck size={20} color={todayAttendance ? '#22c55e' : '#f59e0b'} />
            </div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.2rem' }}>
            {todayAttendance ? (todayAttendance.check_out ? 'Completed' : 'Checked In') : 'Not Checked In'}
          </div>
          <div className="stat-card-label">Today's Status</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#6366f1', cursor: 'pointer' }} onClick={() => setActivePage('my-leaves')}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Calendar size={20} color="#6366f1" />
            </div>
            {pendingLeaves > 0 && <span className="stat-card-trend down">{pendingLeaves} pending</span>}
          </div>
          <div className="stat-card-value">{myLeaves.length}</div>
          <div className="stat-card-label">Leave Requests</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#06b6d4', cursor: 'pointer' }} onClick={() => setActivePage('my-salary')}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
              <DollarSign size={20} color="#06b6d4" />
            </div>
          </div>
          <div className="stat-card-value">EGP {latestPay ? latestPay.net_salary.toLocaleString() : '—'}</div>
          <div className="stat-card-label">Latest Salary</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#a855f7', cursor: 'pointer' }} onClick={() => setActivePage('my-overtime')}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(168,85,247,0.12)' }}>
              <Timer size={20} color="#a855f7" />
            </div>
          </div>
          <div className="stat-card-value">{myOvertime.reduce((s, o) => s + o.hours, 0)}h</div>
          <div className="stat-card-label">Overtime Hours</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Insurance Info */}
        <div className="insurance-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} color="#6366f1" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Insurance Status</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                {user.insurance_active ? '✅ Active' : '❌ Inactive'} — Started {formatDate(user.insurance_start)}
              </p>
            </div>
          </div>
          <div className="insurance-grid">
            <div className="insurance-stat">
              <div className="value">{insurance.years}</div>
              <div className="label">Years</div>
            </div>
            <div className="insurance-stat">
              <div className="value">{insurance.months}</div>
              <div className="label">Months</div>
            </div>
            <div className="insurance-stat">
              <div className="value">{insurance.days}</div>
              <div className="label">Days</div>
            </div>
            <div className="insurance-stat">
              <div className="value">{insurance.totalDays}</div>
              <div className="label">Total Days</div>
            </div>
          </div>
        </div>

        {/* Today Attendance Detail */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Today's Attendance</h3>
              <p>{formatDate(new Date())}</p>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => setActivePage('qr-checkin')}>
              QR Check-In <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body">
            {todayAttendance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Check In</span>
                  <span style={{ fontWeight: 600 }}>{formatTime(todayAttendance.check_in)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Check Out</span>
                  <span style={{ fontWeight: 600 }}>{todayAttendance.check_out ? formatTime(todayAttendance.check_out) : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Working Hours</span>
                  <span style={{ fontWeight: 600 }}>{todayAttendance.working_hours}h</span>
                </div>
                {todayAttendance.delay_minutes > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--accent-warning)', fontSize: '0.82rem' }}>⚠️ Late by</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>{todayAttendance.delay_minutes} min</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 30 }}>
                <AlertTriangle size={32} />
                <p>You haven't checked in today</p>
                <button className="btn btn-primary btn-sm" onClick={() => setActivePage('qr-checkin')}>
                  Go to QR Check-In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>📢 Recent Announcements</h3>
            <p>Stay updated with the latest news</p>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => setActivePage('announcements')}>View All</button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements
            .filter(a => a.department === 'All' || a.department.includes(user.department))
            .slice(0, 3)
            .map(a => (
              <div key={a.id} className={`announcement-item ${a.priority}`} style={{ marginBottom: 0 }}>
                <div className="announcement-title">{a.title}</div>
                <div className="announcement-msg">{a.message}</div>
                <div className="announcement-meta">
                  <span>{formatDate(a.created_at)}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
