import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { mockPayroll, mockEmployees } from '../../utils/mockData';
import { DEPARTMENTS } from '../../utils/constants';
import { formatDate, exportToCSV, calculateSalary } from '../../utils/helpers';
import { Search, Download, DollarSign, TrendingUp, FileText, Eye, X, Printer } from 'lucide-react';
import { sendEmail } from '../../services/emailService';
import { supabase, isDemoMode } from '../../supabaseClient';

export default function PayrollDashboard() {
  const { isHR, user } = useAuth();
  const { addNotification } = useNotifications();
  const [payroll, setPayroll] = useState(mockPayroll);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewSlip, setViewSlip] = useState(null);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchPayroll = async () => {
      let query = supabase.from('payroll').select('*').order('month', { ascending: false });
      if (!isHR) query = query.eq('employee_id', user.id);
      
      const { data } = await query;
      if (data) setPayroll(data);
    };
    fetchPayroll();
  }, [isDemoMode, isHR, user]);

  const filtered = useMemo(() => {
    let data = isHR ? payroll : payroll.filter(p => p.employee_id === user.id);
    if (search) data = data.filter(p => p.employee_name?.toLowerCase().includes(search.toLowerCase()));
    if (monthFilter) data = data.filter(p => p.month === monthFilter);
    if (statusFilter) data = data.filter(p => p.status === statusFilter);
    return data;
  }, [payroll, search, monthFilter, statusFilter, isHR, user]);

  const totalPayroll = filtered.reduce((s, p) => s + p.net_salary, 0);
  const paidCount = filtered.filter(p => p.status === 'paid').length;
  const processingCount = filtered.filter(p => p.status === 'processing').length;

  const handleMarkPaid = async (id) => {
    if (!isDemoMode) {
      const todayDate = new Date().toISOString().split('T')[0];
      await supabase.from('payroll').update({ status: 'paid', paid_date: todayDate }).eq('id', id);
    }
    
    setPayroll(prev => prev.map(p => {
      if (p.id === id) {
        addNotification({
          user_id: p.employee_id,
          type: 'salary_ready',
          title: '💰 Salary Processed',
          message: `Your ${p.month} salary of EGP ${p.net_salary.toLocaleString()} has been processed and is ready.`,
        });
        
        // Send email via Brevo
        sendEmail({
            userId: p.employee_id,
            toName: p.employee_name,
            subject: `Salary Processed - ${p.month}`,
            htmlContent: `<h2>Salary Update</h2>
                <p>Hello ${p.employee_name},</p>
                <p>Your salary for the month of <strong>${p.month}</strong> has been successfully processed.</p>
                <p><strong>Net Salary:</strong> EGP ${p.net_salary.toLocaleString()}</p>
                <p>You can view your full salary slip in the HR Portal.</p>
                <p>Thank you,</p>
                <p>Smart Factory HR</p>`
        });
        
        return { ...p, status: 'paid', paid_date: new Date().toISOString().split('T')[0] };
      }
      return p;
    }));
  };

  return (
    <div>
      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ '--stat-color': '#6366f1' }}>
          <div className="stat-card-header">
            <div className="stat-card-icon" style={{ background: 'rgba(99,102,241,0.12)' }}><DollarSign size={20} color="#6366f1" /></div>
          </div>
          <div className="stat-card-value">EGP {totalPayroll.toLocaleString()}</div>
          <div className="stat-card-label">{isHR ? 'Total Payroll' : 'Total Earnings'}</div>
        </div>
        {isHR && (
          <>
            <div className="stat-card" style={{ '--stat-color': '#22c55e' }}>
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: 'rgba(34,197,94,0.12)' }}><TrendingUp size={20} color="#22c55e" /></div>
              </div>
              <div className="stat-card-value">{paidCount}</div>
              <div className="stat-card-label">Paid</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': '#f59e0b' }}>
              <div className="stat-card-header">
                <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.12)' }}><FileText size={20} color="#f59e0b" /></div>
              </div>
              <div className="stat-card-value">{processingCount}</div>
              <div className="stat-card-label">Processing</div>
            </div>
          </>
        )}
      </div>

      <div className="toolbar">
        {isHR && (
          <div className="search-wrapper">
            <Search size={16} />
            <input type="text" className="search-input" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        <input type="month" className="filter-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
        </select>
        <button className="btn btn-outline" onClick={() => exportToCSV(filtered, 'payroll_report')}>
          <Download size={15} /> Export
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>{isHR ? 'Payroll Records' : 'My Salary History'}</h3>
            <p>{filtered.length} records</p>
          </div>
        </div>
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  {isHR && <th>Department</th>}
                  <th>Month</th>
                  <th>Base</th>
                  <th>Overtime</th>
                  <th>Bonuses</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const totalDeductions = p.penalties + p.late_deductions + p.absence_deductions;
                  return (
                    <tr key={p.id}>
                      {isHR && <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.employee_name}</td>}
                      {isHR && <td>{p.department}</td>}
                      <td style={{ fontWeight: 600 }}>{p.month}</td>
                      <td>EGP {p.base_salary.toLocaleString()}</td>
                      <td style={{ color: 'var(--accent-success)' }}>+{p.overtime_pay.toLocaleString()}</td>
                      <td style={{ color: 'var(--accent-info)' }}>+{(p.bonuses + p.performance_bonus).toLocaleString()}</td>
                      <td style={{ color: totalDeductions > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                        {totalDeductions > 0 ? `-${totalDeductions.toLocaleString()}` : '0'}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--accent-primary-hover)', fontSize: '0.95rem' }}>
                        EGP {p.net_salary.toLocaleString()}
                      </td>
                      <td>
                        {p.status === 'paid'
                          ? <span className="badge badge-success"><span className="badge-dot" />Paid</span>
                          : <span className="badge badge-warning"><span className="badge-dot" />Processing</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon" onClick={() => setViewSlip(p)} title="View Slip"><Eye size={15} /></button>
                          {isHR && p.status === 'processing' && (
                            <button className="btn btn-success btn-xs" onClick={() => handleMarkPaid(p.id)}>Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={isHR ? 10 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payroll records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Salary Slip Modal */}
      {viewSlip && (
        <div className="modal-overlay" onClick={() => setViewSlip(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Salary Slip - {viewSlip.month}</h3>
              <button className="modal-close" onClick={() => setViewSlip(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 24, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 4 }}>Smart Factory</h2>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Salary Slip - {viewSlip.month}</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>{viewSlip.employee_name} — {viewSlip.department}</p>
                </div>

                {/* Earnings */}
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-success)', marginBottom: 12 }}>EARNINGS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    ['Base Salary', viewSlip.base_salary],
                    ['Overtime Pay', viewSlip.overtime_pay],
                    ['Bonuses', viewSlip.bonuses],
                    ['Performance Bonus', viewSlip.performance_bonus],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>EGP {val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Deductions */}
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-danger)', marginBottom: 12 }}>DEDUCTIONS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {[
                    ['Penalties', viewSlip.penalties],
                    ['Late Deductions', viewSlip.late_deductions],
                    ['Absence Deductions', viewSlip.absence_deductions],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: val > 0 ? 'var(--accent-danger)' : 'inherit' }}>
                        {val > 0 ? `-EGP ${val.toLocaleString()}` : 'EGP 0'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Net */}
                <div style={{ borderTop: '2px solid var(--accent-primary)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800 }}>NET SALARY</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-primary-hover)' }}>
                    EGP {viewSlip.net_salary.toLocaleString()}
                  </span>
                </div>

                {viewSlip.paid_date && (
                  <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.78rem', color: 'var(--accent-success)' }}>
                    ✅ Paid on {formatDate(viewSlip.paid_date)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
