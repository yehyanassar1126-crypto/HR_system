import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockAnnouncements } from '../../utils/mockData';
import { DEPARTMENTS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { Plus, X, Megaphone, AlertTriangle, Info, Bell } from 'lucide-react';
import { sendAnnouncementEmail } from '../../services/emailService';
import { supabase, isDemoMode } from '../../supabaseClient';

const priorityIcons = { high: AlertTriangle, medium: Bell, low: Info };

export default function Announcements() {
  const { isHR, user } = useAuth();
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', priority: 'medium', department: 'All' });

  useEffect(() => {
    if (isDemoMode) return;
    const fetchAnnouncements = async () => {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (data) setAnnouncements(data);
    };
    fetchAnnouncements();
  }, []);

  const visible = isHR
    ? announcements
    : announcements.filter(a => a.department === 'All' || a.department.includes(user.department));

  const handlePost = async () => {
    if (!form.title || !form.message) return;
    const newAnn = {
      title: form.title,
      message: form.message,
      priority: form.priority,
      department: form.department,
      created_by: user.full_name,
    };
    
    if (!isDemoMode) {
      const { data } = await supabase.from('announcements').insert([newAnn]).select().single();
      if (data) setAnnouncements(prev => [data, ...prev]);
    } else {
      setAnnouncements(prev => [{ ...newAnn, id: Date.now().toString(), created_at: new Date().toISOString() }, ...prev]);
    }
    
    // Broadcast via Brevo
    sendAnnouncementEmail({
      department: form.department,
      subject: `New Announcement: ${form.title}`,
      htmlContent: `<h2>New Announcement: ${form.title}</h2>
          <p><strong>Priority:</strong> ${form.priority.toUpperCase()}</p>
          <p><strong>From:</strong> ${user.full_name}</p>
          <hr />
          <p>${form.message.replace(/\n/g, '<br/>')}</p>
          <hr />
          <p><small>This announcement was broadcast to: ${form.department}</small></p>`
    });
    
    
    setShowModal(false);
    setForm({ title: '', message: '', priority: 'medium', department: 'All' });
  };

  return (
    <div>
      {isHR && (
        <div className="toolbar">
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="post-announcement-btn">
            <Plus size={16} /> Post Announcement
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visible.map(a => {
          const PIcon = priorityIcons[a.priority] || Info;
          return (
            <div key={a.id} className={`announcement-item ${a.priority}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: a.priority === 'high' ? 'var(--accent-danger-soft)' : a.priority === 'medium' ? 'var(--accent-warning-soft)' : 'var(--accent-info-soft)',
                }}>
                  <PIcon size={18} color={a.priority === 'high' ? '#ef4444' : a.priority === 'medium' ? '#f59e0b' : '#3b82f6'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="announcement-title">{a.title}</div>
                  <div className="announcement-msg">{a.message}</div>
                  <div className="announcement-meta">
                    <span>📅 {formatDate(a.created_at)}</span>
                    <span>👤 {a.created_by}</span>
                    <span>🏢 {a.department}</span>
                    <span className={`badge ${a.priority === 'high' ? 'badge-danger' : a.priority === 'medium' ? 'badge-warning' : 'badge-info'}`}>
                      {a.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="empty-state" style={{ padding: 60 }}>
            <Megaphone size={40} />
            <p>No announcements yet</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📢 Post Announcement</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label>Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Announcement title..." />
              </div>
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label>Message</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Write your announcement..." style={{ minHeight: 120 }} />
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Target Department</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePost}>Publish Announcement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
