import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { mockOvertime } from '../../utils/mockData';
import { DEPARTMENTS } from '../../utils/constants';
import { formatDate, exportToCSV } from '../../utils/helpers';
import { Search, Plus, CheckCircle, XCircle, X, Timer, Download } from 'lucide-react';
import { supabase, isDemoMode } from '../../supabaseClient';

export default function OvertimeManagement() {
  const { isHR, user } = useAuth();
  const { addNotification } = useNotifications();
  const [overtime, setOvertime] = useState(mockOvertime);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: '', hours: '', reason: '', rate: '1.5' });

  useEffect(() => {
    if (isDemoMode) return;
    const fetchOvertime = async () => {
      let query = supabase.from('overtime').select('*').order('date', { ascending: false });
      if (!isHR) query = query.eq('employee_id', user.id);
      
      const { data } = await query;
      if (data) setOvertime(data);
    };
    fetchOvertime();
  }, [isDemoMode, isHR, user]);

  const filtered = useMemo(() => {
    let data = isHR ? overtime : overtime.filter(o => o.employee_id === user.id);
    if (search) data = data.filter(o => o.employee_name?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) data = data.filter(o => o.status === statusFilter);
    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [overtime, search, statusFilter, isHR, user]);

  const totalApproved = filtered.filter(o => o.status === 'approved').reduce((s, o) => s + o.hours, 0);
  const totalPending = filtered.filter(o => o.status === 'pending').reduce((s, o) => s + o.hours, 0);

  const handleSubmit = async () => {
    if (!form.date || !form.hours || !form.reason) return;
    const newOT = {
      employee_id: user.id,
      employee_name: user.full_name,
      department: user.department,
      date: form.date,
      hours: Number(form.hours),
      reason: form.reason,
      status: 'pending',
      rate: Number(form.rate),
      approved_by: null,
    };
    
    if (!isDemoMode) {
      const { data } = await supabase.from('overtime').insert([newOT]).select().single();
      if (data) setOvertime(prev => [data, ...prev]);
    } else {
      setOvertime(prev => [{ ...newOT, id: Date.now().toString() }, ...prev]);
    }
    
    setShowModal(false);
    setForm({ date: '', hours: '', reason: '', rate: '1.5' });
  };

  const handleAction = async (id, action) => {
    if (!isDemoMode) {
      await supabase.from('overtime').update({ status: action, approved_by: user.full_name }).eq('id', id);
    }
    setOvertime(prev => prev.map(o => {
      if (o.id === id) {
        addNotification({
          user_id: o.employee_id,
          type: action === 'approved' ? 'overtime_approved' : 'overtime_rejected',
          title: `Overtime ${action === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
          message: `Your ${o.hours}h overtime on ${formatDate(o.date)} has been ${action}. ${action === 'approved' ? 'It will be added to your salary.' : ''}`,
        });
        return { ...o, status: action, approved_by: user.full_name };
      }
      return o;
    }));
  };

  return (
    <div>
      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ '--stat-color': '#22c55e' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>
              <CheckCircle size={20} color="#22c55e" />
            </div>
          </div>
          <div className="stat-card-value">{totalApproved}h</div>
          <div className="stat-card-label">Approved Hours</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <Timer size={20} color="#f59e0b" />
            </div>
          </div>
          <div className="stat-card-value">{totalPending}h</div>
          <div className="stat-card-label">Pending Approval</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Timer size={20} color="#6366f1" />
            </div>
          </div>
          <div className="stat-card-value">{filtered.length}</div>
          <div className="stat-card-label">Total Records</div>
        </div>
      </div>

      <div className="toolbar">
        {isHR && (
          <div className="search-wrapper">
            <Search size={16} />
            <input type="text" className="search-input" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        {!isHR && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Log Overtime
          </button>
        )}
        <button className="btn btn-outline" onClick={() => exportToCSV(filtered, 'overtime_report')}>
          <Download size={15} /> Export
        </button>
      </div>

      <div className="card">
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  {isHR && <th>Department</th>}
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isHR && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    {isHR && <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{o.employee_name}</td>}
                    {isHR && <td>{o.department}</td>}
                    <td>{formatDate(o.date)}</td>
                    <td style={{ fontWeight: 700 }}>{o.hours}h</td>
                    <td>{o.rate}x</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.reason}</td>
                    <td>
                      {o.status === 'approved' && <span className="badge badge-success"><span className="badge-dot" />Approved</span>}
                      {o.status === 'pending' && <span className="badge badge-warning"><span className="badge-dot" />Pending</span>}
                      {o.status === 'rejected' && <span className="badge badge-danger"><span className="badge-dot" />Rejected</span>}
                    </td>
                    {isHR && (
                      <td>
                        {o.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-success btn-xs" onClick={() => handleAction(o.id, 'approved')}>
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button className="btn btn-danger btn-xs" onClick={() => handleAction(o.id, 'rejected')}>
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {o.approved_by}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={isHR ? 8 : 6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No overtime records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Overtime Hours</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Hours</label>
                  <input type="number" step="0.5" min="0.5" max="8" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="e.g. 2" />
                </div>
              </div>
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label>Rate Multiplier</label>
                <select value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })}>
                  <option value="1.5">1.5x (Regular Overtime)</option>
                  <option value="2">2x (Holiday/Weekend)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Reason</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Why did you work overtime?" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
