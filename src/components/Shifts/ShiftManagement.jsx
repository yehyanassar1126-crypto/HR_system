import { useState, useEffect } from 'react';
import { mockEmployees } from '../../utils/mockData';
import { supabase, isDemoMode } from '../../supabaseClient';
import { DEPARTMENTS, SHIFTS } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';
import { Search, Edit, X, Clock, Sun, Moon, Sunset } from 'lucide-react';

const shiftIcons = { morning: Sun, evening: Sunset, night: Moon };

export default function ShiftManagement() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newShift, setNewShift] = useState('');

  useEffect(() => {
    if (isDemoMode) return;
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'employee');
      if (data) setEmployees(data);
    };
    fetchUsers();
  }, []);

  const filtered = employees.filter(e => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    const matchShift = !shiftFilter || e.shift === shiftFilter;
    return matchSearch && matchDept && matchShift;
  });

  const handleChangeShift = async (id) => {
    if (!newShift) return;
    if (!isDemoMode) {
      await supabase.from('users').update({ shift: newShift }).eq('id', id);
    }
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, shift: newShift } : e));
    setEditingId(null);
    setNewShift('');
  };

  const shiftCounts = Object.keys(SHIFTS).reduce((acc, s) => {
    acc[s] = employees.filter(e => e.shift === s).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Shift Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {Object.entries(SHIFTS).map(([key, shift]) => {
          const Icon = shiftIcons[key];
          const colors = {
            morning: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
            evening: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c' },
            night: { bg: 'rgba(129,140,248,0.12)', color: '#818cf8' },
          };
          return (
            <div key={key} className="stat-card" style={{ '--stat-color': colors[key].color }}>
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: colors[key].bg }}>
                  <Icon size={20} color={colors[key].color} />
                </div>
              </div>
              <div className="stat-card-value">{shiftCounts[key]}</div>
              <div className="stat-card-label">{shift.label} ({shift.start} - {shift.end})</div>
            </div>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input type="text" className="search-input" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}>
          <option value="">All Shifts</option>
          {Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Shift Assignments</h3>
            <p>{filtered.length} employees</p>
          </div>
        </div>
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Current Shift</th>
                  <th>Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="sidebar-avatar" style={{ background: emp.avatar_color, width: 32, height: 32, fontSize: '0.7rem' }}>
                          {getInitials(emp.full_name)}
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{emp.full_name}</span>
                      </div>
                    </td>
                    <td>{emp.department}</td>
                    <td>
                      <span className={`shift-badge shift-${emp.shift}`}>
                        <Clock size={11} /> {SHIFTS[emp.shift]?.label}
                      </span>
                    </td>
                    <td>{SHIFTS[emp.shift]?.start} - {SHIFTS[emp.shift]?.end}</td>
                    <td>
                      {editingId === emp.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select className="filter-select" value={newShift} onChange={e => setNewShift(e.target.value)} style={{ padding: '6px 10px' }}>
                            <option value="">Select...</option>
                            {Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <button className="btn btn-success btn-xs" onClick={() => handleChangeShift(emp.id)}>Save</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}><X size={14} /></button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(emp.id); setNewShift(emp.shift); }}>
                          <Edit size={13} /> Change
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
