import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockAttendance } from '../../utils/mockData';
import { DEPARTMENTS } from '../../utils/constants';
import { formatDate, formatTime, exportToCSV } from '../../utils/helpers';
import { Search, Download, CalendarCheck, Clock, AlertTriangle, Filter } from 'lucide-react';
import { supabase, isDemoMode } from '../../supabaseClient';

export default function AttendanceLog() {
  const { isHR, user } = useAuth();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [attendance, setAttendance] = useState(mockAttendance);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchAttendance = async () => {
      let query = supabase.from('attendance').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
      if (!isHR) query = query.eq('employee_id', user.id);
      
      const { data } = await query;
      if (data) setAttendance(data);
    };
    fetchAttendance();
  }, [isDemoMode, isHR, user]);

  const records = useMemo(() => {
    let data = isHR ? attendance : attendance.filter(a => a.employee_id === user.id);
    if (search) data = data.filter(a => a.employee_name?.toLowerCase().includes(search.toLowerCase()));
    if (deptFilter) data = data.filter(a => a.department === deptFilter);
    if (dateFilter) data = data.filter(a => a.date === dateFilter);
    if (statusFilter) data = data.filter(a => a.status === statusFilter);
    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendance, search, deptFilter, dateFilter, statusFilter, isHR, user]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present': return <span className="badge badge-success"><span className="badge-dot" />Present</span>;
      case 'checked_in': return <span className="badge badge-info"><span className="badge-dot" />Checked In</span>;
      case 'absent': return <span className="badge badge-danger"><span className="badge-dot" />Absent</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div>
      <div className="toolbar">
        {isHR && (
          <div className="search-wrapper">
            <Search size={16} />
            <input type="text" className="search-input" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        {isHR && (
          <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <input type="date" className="filter-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="checked_in">Checked In</option>
          <option value="absent">Absent</option>
        </select>
        <button className="btn btn-outline" onClick={() => exportToCSV(records, 'attendance_report')}>
          <Download size={15} /> Export
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>{isHR ? 'Attendance Records' : 'My Attendance History'}</h3>
            <p>{records.length} records</p>
          </div>
        </div>
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  {isHR && <th>Department</th>}
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Shift</th>
                  <th>Working Hours</th>
                  <th>Delay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    {isHR && <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.employee_name}</td>}
                    {isHR && <td>{r.department}</td>}
                    <td>{formatDate(r.date)}</td>
                    <td>{r.check_in ? formatTime(r.check_in) : '—'}</td>
                    <td>{r.check_out ? formatTime(r.check_out) : '—'}</td>
                    <td><span className={`shift-badge shift-${r.shift}`}><Clock size={11} /> {r.shift}</span></td>
                    <td>{r.working_hours ? `${r.working_hours}h` : '—'}</td>
                    <td>
                      {r.delay_minutes > 0 ? (
                        <span style={{ color: 'var(--accent-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={13} /> {r.delay_minutes} min
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-success)' }}>On time</span>
                      )}
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={isHR ? 9 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No attendance records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
