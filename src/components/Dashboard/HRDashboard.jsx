import { useState, useMemo, useEffect } from 'react';
import { mockEmployees, mockAttendance, mockLeaves, mockOvertime, mockPayroll, mockAnnouncements } from '../../utils/mockData';
import { supabase, isDemoMode } from '../../supabaseClient';
import { DEPARTMENTS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/helpers';
import {
  Users, CalendarCheck, Clock, DollarSign, TrendingUp, AlertTriangle,
  UserCheck, UserX, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function HRDashboard({ setActivePage }) {
  const [employees, setEmployees] = useState(mockEmployees);
  const [attendance, setAttendance] = useState(mockAttendance);
  const [leaves, setLeaves] = useState(mockLeaves);
  const [overtime, setOvertime] = useState(mockOvertime);
  const [payroll, setPayroll] = useState(mockPayroll);
  const [announcements, setAnnouncements] = useState(mockAnnouncements);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchData = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const [empRes, attRes, leaveRes, otRes, payRes, annRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'employee'),
        supabase.from('attendance').select('*').eq('date', todayStr),
        supabase.from('leave_requests').select('*'),
        supabase.from('overtime').select('*'),
        supabase.from('payroll').select('*'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (attRes.data) setAttendance(attRes.data);
      if (leaveRes.data) setLeaves(leaveRes.data);
      if (otRes.data) setOvertime(otRes.data);
      if (payRes.data) setPayroll(payRes.data);
      if (annRes.data) setAnnouncements(annRes.data);
    };
    fetchData();
  }, []);

  const totalEmployees = employees.length;
  const presentToday = attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && (a.status === 'present' || a.status === 'checked_in')).length;
  const absentToday = totalEmployees - presentToday;
  const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
  const pendingOvertime = overtime.filter(o => o.status === 'pending').length;
  const totalPayroll = payroll.reduce((sum, p) => sum + p.net_salary, 0);

  const deptData = useMemo(() => {
    const counts = {};
    DEPARTMENTS.forEach(d => counts[d] = 0);
    employees.forEach(e => counts[e.department] = (counts[e.department] || 0) + 1);
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b', '#22c55e'],
        borderWidth: 0,
        borderRadius: 4,
      }]
    };
  }, []);

  const attendanceChart = useMemo(() => ({
    labels: ['Present', 'Absent', 'Late'],
    datasets: [{
      data: [presentToday, absentToday, attendance.filter(a => a.delay_minutes > 0 && a.date === new Date().toISOString().split('T')[0]).length],
      backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
      borderWidth: 0,
    }]
  }), [presentToday, absentToday, attendance]);

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Users size={20} color="#6366f1" />
            </div>
            <span className="stat-card-trend up"><ArrowUpRight size={12} /> +2</span>
          </div>
          <div className="stat-card-value">{totalEmployees}</div>
          <div className="stat-card-label">Total Employees</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#22c55e' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <UserCheck size={20} color="#22c55e" />
            </div>
          </div>
          <div className="stat-card-value">{presentToday}</div>
          <div className="stat-card-label">Present Today</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#ef4444' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <UserX size={20} color="#ef4444" />
            </div>
          </div>
          <div className="stat-card-value">{absentToday}</div>
          <div className="stat-card-label">Absent Today</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <CalendarCheck size={20} color="#f59e0b" />
            </div>
            {pendingLeaves > 0 && <span className="stat-card-trend down"><AlertTriangle size={12} /> {pendingLeaves}</span>}
          </div>
          <div className="stat-card-value">{pendingLeaves}</div>
          <div className="stat-card-label">Pending Leave Requests</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#06b6d4' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
              <Clock size={20} color="#06b6d4" />
            </div>
          </div>
          <div className="stat-card-value">{pendingOvertime}</div>
          <div className="stat-card-label">Pending Overtime</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#a855f7' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(168,85,247,0.12)' }}>
              <DollarSign size={20} color="#a855f7" />
            </div>
          </div>
          <div className="stat-card-value">EGP {totalPayroll.toLocaleString()}</div>
          <div className="stat-card-label">Total Payroll (This Month)</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Today's Attendance</h3>
              <p>Employee check-in status overview</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 200, height: 200 }}>
              <Doughnut data={attendanceChart} options={{
                cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } } },
                maintainAspectRatio: false,
              }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Department Distribution</h3>
              <p>Employees per department</p>
            </div>
          </div>
          <div className="chart-container" style={{ height: 260, padding: '20px 20px 10px' }}>
            <Bar data={deptData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#64748b' }, grid: { display: false }, border: { display: false } },
                y: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: 'rgba(148,163,184,0.06)' }, border: { display: false } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Pending Leave Requests</h3>
              <p>Awaiting your approval</p>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setActivePage('leaves')}>View All</button>
          </div>
          <div className="card-body no-pad">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.filter(l => l.status === 'pending').slice(0, 4).map(l => (
                    <tr key={l.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.employee_name}</td>
                      <td>{l.type}</td>
                      <td>{l.days}</td>
                      <td><span className="badge badge-warning"><span className="badge-dot" />Pending</span></td>
                    </tr>
                  ))}
                  {leaves.filter(l => l.status === 'pending').length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>No pending requests</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>Recent Announcements</h3>
              <p>Latest company updates</p>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setActivePage('announcements')}>View All</button>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.slice(0, 3).map(a => (
              <div key={a.id} className={`announcement-item ${a.priority}`} style={{ marginBottom: 0 }}>
                <div className="announcement-title">{a.title}</div>
                <div className="announcement-msg" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.message}</div>
                <div className="announcement-meta">
                  <span>{formatDate(a.created_at)}</span>
                  <span>{a.department}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
