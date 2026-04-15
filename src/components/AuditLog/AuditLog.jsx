import { useState, useMemo, useEffect } from 'react';
import { mockAuditLog } from '../../utils/mockData';
import { formatDateTime, exportToCSV } from '../../utils/helpers';
import { Search, Download, Filter, FileText } from 'lucide-react';
import { supabase, isDemoMode } from '../../supabaseClient';

const actionTypes = [...new Set(mockAuditLog.map(l => l.action))];

export default function AuditLog() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [logs, setLogs] = useState(mockAuditLog);
  const [dbActionTypes, setDbActionTypes] = useState(actionTypes);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchLogs = async () => {
      const { data } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
      if (data) {
          const mappedLogs = data.map(l => ({
              ...l,
              user: l.user_name,
              timestamp: l.created_at,
              ip: '127.0.0.1' // not tracked in DB
          }));
          setLogs(mappedLogs);
          setDbActionTypes([...new Set(mappedLogs.map(l => l.action))]);
      }
    };
    fetchLogs();
  }, []);

  const filtered = useMemo(() => {
    let data = [...logs];
    if (search) data = data.filter(l =>
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
    );
    if (actionFilter) data = data.filter(l => l.action === actionFilter);
    if (dateFilter) data = data.filter(l => l.timestamp.startsWith(dateFilter));
    return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [search, actionFilter, dateFilter, logs]);

  return (
    <div>
      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input type="text" className="search-input" placeholder="Search by user or details..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {dbActionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" className="filter-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <button className="btn btn-outline" onClick={() => exportToCSV(filtered, 'audit_log')}>
          <Download size={15} /> Export
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>🔒 System Audit Log</h3>
            <p>{filtered.length} events recorded</p>
          </div>
        </div>
        <div className="card-body no-pad">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{formatDateTime(log.timestamp)}</td>
                    <td><span className={`audit-action audit-${log.action}`}>{log.action.replace(/_/g, ' ')}</span></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{log.user}</td>
                    <td style={{ maxWidth: 300 }}>{log.details}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{log.ip}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
