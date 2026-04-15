import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { mockLeaves } from '../../utils/mockData';
import { DEPARTMENTS, LEAVE_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import { Search, Plus, CheckCircle, XCircle, X, Calendar, Download } from 'lucide-react';
import { exportToCSV } from '../../utils/helpers';
import { sendEmail } from '../../services/emailService';
import { supabase, isDemoMode } from '../../supabaseClient';

export default function LeaveManagement() {
  const { isHR, user } = useAuth();
  const { addNotification } = useNotifications();
  const [leaves, setLeaves] = useState(mockLeaves);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    type: 'Annual', start_date: '', end_date: '', reason: '',
  });

  useEffect(() => {
    if (isDemoMode) return;
    const fetchLeaves = async () => {
      let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
      if (!isHR) query = query.eq('employee_id', user.id);
      
      const { data } = await query;
      if (data) setLeaves(data);
    };
    fetchLeaves();
  }, [isDemoMode, isHR, user]);

  const filtered = useMemo(() => {
    let data = isHR ? leaves : leaves.filter(l => l.employee_id === user.id);
    if (search) data = data.filter(l => l.employee_name?.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) data = data.filter(l => l.status === statusFilter);
    if (deptFilter) data = data.filter(l => l.department === deptFilter);
    return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [leaves, search, statusFilter, deptFilter, isHR, user]);

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date || !form.reason) return;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const newLeave = {
      employee_id: user.id,
      employee_name: user.full_name,
      department: user.department,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date,
      days,
      reason: form.reason,
      status: 'pending',
    };

    if (!isDemoMode) {
      const { data, error } = await supabase.from('leave_requests').insert([newLeave]).select().single();
      if (data) setLeaves(prev => [data, ...prev]);
    } else {
      setLeaves(prev => [{ id: Date.now().toString(), ...newLeave, created_at: new Date().toISOString() }, ...prev]);
    }

    setShowModal(false);
    setForm({ type: 'Annual', start_date: '', end_date: '', reason: '' });
  };

  const handleAction = async (id, action) => {
    if (!isDemoMode) {
      await supabase.from('leave_requests').update({ status: action, approved_by: user.full_name }).eq('id', id);
      
      // Also log the action
      await supabase.from('audit_log').insert({
        action: action === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        user_name: user.full_name,
        user_id: user.id,
        details: `${action === 'approved' ? 'Approved' : 'Rejected'} leave request ID: ${id}`
      });
    }

    setLeaves(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, status: action, approved_by: user.full_name };
        addNotification({
          user_id: l.employee_id,
          type: action === 'approved' ? 'leave_approved' : 'leave_rejected',
          title: `Leave ${action === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
          message: `Your ${l.type} leave request (${formatDate(l.start_date)} - ${formatDate(l.end_date)}) has been ${action}.`,
        });
        
        // Send email via Brevo
        sendEmail({
            userId: l.employee_id,
            toName: l.employee_name,
            subject: `Leave Request ${action === 'approved' ? 'Approved' : 'Rejected'}`,
            htmlContent: `<h2>Leave Request Update</h2>
                <p>Hello ${l.employee_name},</p>
                <p>Your ${l.type} leave request for the dates <strong>${formatDate(l.start_date)} to ${formatDate(l.end_date)}</strong> has been <strong>${action}</strong> by HR.</p>
                <p>Status: ${action}</p>
                <p>Thank you,</p>
                <p>Smart Factory HR</p>`
        });
        
        return updated;
      }
      return l;
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="badge badge-success"><span className="badge-dot" />Approved</span>;
      case 'rejected': return <span className="badge badge-danger"><span className="badge-dot" />Rejected</span>;
      case 'pending': return <span className="badge badge-warning"><span className="badge-dot" />Pending</span>;
      default: return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div>
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
        {isHR && (
          <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {!isHR && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="request-leave-btn">
            <Plus size={16} /> Request Leave
          </button>
        )}
        {isHR && (
          <button className="btn btn-outline" onClick={() => exportToCSV(filtered, 'leave_report')}>
            <Download size={15} /> Export
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>{isHR ? 'All Leave Requests' : 'My Leave Requests'}</h3>
            <p>{filtered.length} requests</p>
          </div>
        </div>
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  {isHR && <th>Department</th>}
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isHR && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    {isHR && <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.employee_name}</td>}
                    {isHR && <td>{l.department}</td>}
                    <td><span className="badge badge-info">{l.type}</span></td>
                    <td>{formatDate(l.start_date)}</td>
                    <td>{formatDate(l.end_date)}</td>
                    <td style={{ fontWeight: 600 }}>{l.days}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.reason}</td>
                    <td>{getStatusBadge(l.status)}</td>
                    {isHR && (
                      <td>
                        {l.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-success btn-xs" onClick={() => handleAction(l.id, 'approved')}>
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button className="btn btn-danger btn-xs" onClick={() => handleAction(l.id, 'rejected')}>
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By {l.approved_by}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={isHR ? 9 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No leave requests found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Leave Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Leave</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-field">
                  <label>Leave Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Reason</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Explain the reason for your leave..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
