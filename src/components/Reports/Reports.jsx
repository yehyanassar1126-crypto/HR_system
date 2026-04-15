import { useState, useMemo, useEffect } from 'react';
import { mockEmployees, mockAttendance, mockLeaves, mockPayroll } from '../../utils/mockData';
import { supabase, isDemoMode } from '../../supabaseClient';
import { DEPARTMENTS } from '../../utils/constants';
import { exportToCSV } from '../../utils/helpers';
import { Download, BarChart3, PieChart, TrendingUp, Users } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function Reports() {
  const [activeReport, setActiveReport] = useState('attendance');
  const [employees, setEmployees] = useState(mockEmployees);
  const [attendance, setAttendance] = useState(mockAttendance);
  const [leaves, setLeaves] = useState(mockLeaves);
  const [payroll, setPayroll] = useState(mockPayroll);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchData = async () => {
      const [empRes, attRes, leaveRes, payRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'employee'),
        supabase.from('attendance').select('*'),
        supabase.from('leave_requests').select('*'),
        supabase.from('payroll').select('*')
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (attRes.data) setAttendance(attRes.data);
      if (leaveRes.data) setLeaves(leaveRes.data);
      if (payRes.data) setPayroll(payRes.data);
    };
    fetchData();
  }, []);

  const chartColors = ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6'];

  // Attendance by department
  const attendanceByDept = useMemo(() => {
    const data = {};
    DEPARTMENTS.forEach(d => {
      const deptRecords = attendance.filter(a => a.department === d);
      data[d] = {
        present: deptRecords.filter(a => a.status === 'present' || a.status === 'checked_in').length,
        absent: deptRecords.filter(a => a.status === 'absent').length,
        late: deptRecords.filter(a => a.delay_minutes > 0).length,
      };
    });
    return data;
  }, [attendance]);

  const attendanceChartData = {
    labels: DEPARTMENTS,
    datasets: [
      { label: 'Present', data: DEPARTMENTS.map(d => attendanceByDept[d].present), backgroundColor: '#22c55e', borderRadius: 4 },
      { label: 'Absent', data: DEPARTMENTS.map(d => attendanceByDept[d].absent), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: 'Late', data: DEPARTMENTS.map(d => attendanceByDept[d].late), backgroundColor: '#f59e0b', borderRadius: 4 },
    ],
  };

  // Absenteeism analysis
  const absenteeismData = useMemo(() => {
    const empAbsent = {};
    attendance.filter(a => a.status === 'absent').forEach(a => {
      empAbsent[a.employee_name] = (empAbsent[a.employee_name] || 0) + 1;
    });
    return empAbsent;
  }, [attendance]);

  const absentChart = {
    labels: Object.keys(absenteeismData),
    datasets: [{
      data: Object.values(absenteeismData),
      backgroundColor: chartColors,
      borderWidth: 0,
    }],
  };

  // Department performance (salary-based proxy)
  const deptPerformance = useMemo(() => {
    const data = {};
    DEPARTMENTS.forEach(d => {
      const deptPayroll = payroll.filter(p => p.department === d);
      const avgSalary = deptPayroll.length ? deptPayroll.reduce((s, p) => s + p.net_salary, 0) / deptPayroll.length : 0;
      const avgBonus = deptPayroll.length ? deptPayroll.reduce((s, p) => s + p.performance_bonus, 0) / deptPayroll.length : 0;
      data[d] = { avgSalary: Math.round(avgSalary), avgBonus: Math.round(avgBonus), employees: employees.filter(e => e.department === d).length };
    });
    return data;
  }, [payroll, employees]);

  const perfChartData = {
    labels: DEPARTMENTS,
    datasets: [
      {
        label: 'Avg Salary',
        data: DEPARTMENTS.map(d => deptPerformance[d].avgSalary),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#6366f1',
      },
      {
        label: 'Avg Performance Bonus',
        data: DEPARTMENTS.map(d => deptPerformance[d].avgBonus),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#22c55e',
      },
    ],
  };

  // Leave analytics
  const leaveByType = useMemo(() => {
    const data = {};
    leaves.forEach(l => { data[l.type] = (data[l.type] || 0) + 1; });
    return data;
  }, [leaves]);

  const leaveChart = {
    labels: Object.keys(leaveByType),
    datasets: [{
      data: Object.values(leaveByType),
      backgroundColor: ['#6366f1', '#ef4444', '#f59e0b', '#06b6d4', '#a855f7'],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { display: false }, border: { display: false } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.06)' }, border: { display: false } },
    },
  };

  const exportReport = (type) => {
    switch (type) {
      case 'attendance':
        exportToCSV(attendance, 'attendance_report');
        break;
      case 'absenteeism':
        exportToCSV(Object.entries(absenteeismData).map(([name, count]) => ({ Employee: name, 'Absent Days': count })), 'absenteeism_report');
        break;
      case 'performance':
        exportToCSV(DEPARTMENTS.map(d => ({ Department: d, ...deptPerformance[d] })), 'department_performance');
        break;
      case 'leaves':
        exportToCSV(leaves, 'leave_report');
        break;
    }
  };

  return (
    <div>
      {/* Report Tabs */}
      <div className="tabs" style={{ marginBottom: 24, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '4px', background: 'var(--bg-card)', display: 'inline-flex', gap: 0 }}>
        {[
          { id: 'attendance', label: 'Attendance', icon: BarChart3 },
          { id: 'absenteeism', label: 'Absenteeism', icon: PieChart },
          { id: 'performance', label: 'Dept Performance', icon: TrendingUp },
          { id: 'leaves', label: 'Leave Analytics', icon: Users },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab ${activeReport === tab.id ? 'active' : ''}`}
              onClick={() => setActiveReport(tab.id)}
              style={{ borderBottom: 'none', borderRadius: 'var(--radius-md)', margin: 0, background: activeReport === tab.id ? 'var(--accent-primary-soft)' : 'transparent' }}
            >
              <Icon size={14} style={{ marginRight: 6 }} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Attendance Report */}
      {activeReport === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>📊 Monthly Attendance Report</h3>
              <p>Attendance breakdown by department</p>
            </div>
            <button className="btn btn-outline" onClick={() => exportReport('attendance')}>
              <Download size={15} /> Export CSV
            </button>
          </div>
          <div className="chart-container" style={{ height: 350, padding: 24 }}>
            <Bar data={attendanceChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Absenteeism Report */}
      {activeReport === 'absenteeism' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>🔴 Absenteeism Analysis</h3>
              <p>Track absent patterns across employees</p>
            </div>
            <button className="btn btn-outline" onClick={() => exportReport('absenteeism')}>
              <Download size={15} /> Export CSV
            </button>
          </div>
          <div className="chart-container" style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Object.keys(absenteeismData).length > 0 ? (
              <div style={{ width: 280, height: 280 }}>
                <Doughnut data={absentChart} options={{ ...chartOptions, scales: undefined, cutout: '60%' }} />
              </div>
            ) : (
              <div className="empty-state"><p>No absenteeism data available</p></div>
            )}
          </div>
        </div>
      )}

      {/* Department Performance */}
      {activeReport === 'performance' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {DEPARTMENTS.map((d, i) => (
              <div key={d} className="stat-card" style={{ '--stat-color': chartColors[i] }}>
                <div className="stat-card-header">
                  <div className="stat-card-icon" style={{ background: `${chartColors[i]}20` }}>
                    <Users size={18} color={chartColors[i]} />
                  </div>
                </div>
                <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>EGP {deptPerformance[d].avgSalary.toLocaleString()}</div>
                <div className="stat-card-label">{d} - Avg Salary ({deptPerformance[d].employees} emp)</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <div>
                <h3>📈 Department Performance Insights</h3>
                <p>Average salary and performance bonus comparison</p>
              </div>
              <button className="btn btn-outline" onClick={() => exportReport('performance')}>
                <Download size={15} /> Export CSV
              </button>
            </div>
            <div className="chart-container" style={{ height: 320, padding: 24 }}>
              <Line data={perfChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Leave Analytics */}
      {activeReport === 'leaves' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>🏖️ Leave Analytics</h3>
              <p>Leave distribution by type</p>
            </div>
            <button className="btn btn-outline" onClick={() => exportReport('leaves')}>
              <Download size={15} /> Export CSV
            </button>
          </div>
          <div className="chart-container" style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 280, height: 280 }}>
              <Doughnut data={leaveChart} options={{ ...chartOptions, scales: undefined, cutout: '60%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
