import { useState, useEffect } from 'react';
import { mockEmployees } from '../../utils/mockData';
import { DEPARTMENTS, SHIFTS } from '../../utils/constants';
import { formatDate, getInitials, calculateInsuranceDuration } from '../../utils/helpers';
import { Search, Plus, Edit, Trash2, Eye, X, Shield, Clock } from 'lucide-react';
import { supabase, isDemoMode } from '../../supabaseClient';

export default function EmployeeList() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchEmps = async () => {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (data) {
          // Filter out HR users so they don't show in employee list if desired, though showing all is fine
          setEmployees(data.filter(u => u.role === 'employee'));
      }
    };
    fetchEmps();
  }, []);

  const filtered = employees.filter(e => {
    const matchSearch = e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const [form, setForm] = useState({
    full_name: '', email: '', username: '', department: 'Production',
    position: '', phone: '', base_salary: '', shift: 'morning',
    insurance_start: '', hire_date: '',
  });

  const openAdd = () => {
    setEditEmployee(null);
    setForm({ full_name: '', email: '', username: '', department: 'Production', position: '', phone: '', base_salary: '', shift: 'morning', insurance_start: '', hire_date: '' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditEmployee(emp);
    setForm({ ...emp, base_salary: emp.base_salary.toString() });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.department) return;
    
    if (editEmployee) {
      if (!isDemoMode) {
        await supabase.from('users').update({ ...form, base_salary: Number(form.base_salary) }).eq('id', editEmployee.id);
      }
      setEmployees(prev => prev.map(e => e.id === editEmployee.id ? { ...e, ...form, base_salary: Number(form.base_salary) } : e));
    } else {
      const newEmp = {
        ...form,
        employee_id: 'EMP-' + String(employees.length + 1).padStart(3, '0'),
        role: 'employee',
        base_salary: Number(form.base_salary),
        insurance_active: true,
        status: 'active',
        avatar_color: `hsl(${Math.random() * 360}, 60%, 50%)`,
        password_hash: 'emp123', // default password for new employees
      };
      
      if (!isDemoMode) {
        const { data } = await supabase.from('users').insert([newEmp]).select().single();
        if (data) setEmployees(prev => [...prev, data]);
      } else {
        setEmployees(prev => [...prev, { ...newEmp, id: Date.now().toString() }]);
      }
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to remove this employee?')) {
      if (!isDemoMode) {
          await supabase.from('users').delete().eq('id', id);
      }
      setEmployees(prev => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="employee-search"
          />
        </div>
        <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd} id="add-employee-btn">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>All Employees</h3>
            <p>{filtered.length} employees found</p>
          </div>
        </div>
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Shift</th>
                  <th>Status</th>
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
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{emp.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ color: 'var(--accent-primary)', fontSize: '0.78rem' }}>{emp.employee_id}</code></td>
                    <td>{emp.department}</td>
                    <td>{emp.position}</td>
                    <td><span className={`shift-badge shift-${emp.shift}`}><Clock size={11} /> {SHIFTS[emp.shift]?.label}</span></td>
                    <td><span className="badge badge-success"><span className="badge-dot" />{emp.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setViewEmployee(emp)} title="View"><Eye size={15} /></button>
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(emp)} title="Edit"><Edit size={15} /></button>
                        <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(emp.id)} title="Delete" style={{ color: 'var(--accent-danger)' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Employee Modal */}
      {viewEmployee && (
        <div className="modal-overlay" onClick={() => setViewEmployee(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Employee Profile</h3>
              <button className="modal-close" onClick={() => setViewEmployee(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="profile-header" style={{ marginBottom: 20 }}>
                <div className="profile-avatar" style={{ background: viewEmployee.avatar_color }}>{getInitials(viewEmployee.full_name)}</div>
                <div className="profile-info">
                  <h2>{viewEmployee.full_name}</h2>
                  <div className="profile-meta">
                    <span>🆔 {viewEmployee.employee_id}</span>
                    <span>🏢 {viewEmployee.department}</span>
                    <span>💼 {viewEmployee.position}</span>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field"><label>Email</label><input value={viewEmployee.email} readOnly className="form-input" style={{ padding: '10px 14px' }} /></div>
                <div className="form-field"><label>Phone</label><input value={viewEmployee.phone} readOnly className="form-input" style={{ padding: '10px 14px' }} /></div>
              </div>
              <div className="form-row">
                <div className="form-field"><label>Hire Date</label><input value={formatDate(viewEmployee.hire_date)} readOnly className="form-input" style={{ padding: '10px 14px' }} /></div>
                <div className="form-field"><label>Base Salary</label><input value={`EGP ${viewEmployee.base_salary.toLocaleString()}`} readOnly className="form-input" style={{ padding: '10px 14px' }} /></div>
              </div>
              {viewEmployee.insurance_start && (() => {
                const ins = calculateInsuranceDuration(viewEmployee.insurance_start);
                return (
                  <div className="insurance-card" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={18} color="#6366f1" />
                      <span style={{ fontWeight: 600 }}>Insurance: Active since {formatDate(viewEmployee.insurance_start)}</span>
                    </div>
                    <div className="insurance-grid" style={{ marginTop: 12 }}>
                      <div className="insurance-stat"><div className="value">{ins.years}</div><div className="label">Years</div></div>
                      <div className="insurance-stat"><div className="value">{ins.months}</div><div className="label">Months</div></div>
                      <div className="insurance-stat"><div className="value">{ins.days}</div><div className="label">Days</div></div>
                      <div className="insurance-stat"><div className="value">{ins.totalDays}</div><div className="label">Total Days</div></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Full Name *</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. Ahmed Hassan" />
                </div>
                <div className="form-field">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="e.g. ahmed@factory.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Username</label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Login username" />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+20 1xx xxx xxxx" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Department *</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Position</label>
                  <input value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} placeholder="Job title" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Base Salary (EGP)</label>
                  <input type="number" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0" />
                </div>
                <div className="form-field">
                  <label>Shift</label>
                  <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                    {Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Hire Date</label>
                  <input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Insurance Start Date</label>
                  <input type="date" value={form.insurance_start} onChange={e => setForm({ ...form, insurance_start: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editEmployee ? 'Save Changes' : 'Add Employee'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
