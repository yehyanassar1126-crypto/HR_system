import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SHIFTS } from '../../utils/constants';
import { formatTime, formatDate } from '../../utils/helpers';
import { QrCode, CheckCircle, Clock, LogIn, LogOut } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, isDemoMode } from '../../supabaseClient';

export default function QRCheckin() {
  const { user } = useAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanning, setScanning] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState(null);

  useEffect(() => {
    if (isDemoMode) return;
    const fetchToday = async () => {
       const todayStr = new Date().toISOString().split('T')[0];
       const { data } = await supabase.from('attendance')
          .select('*')
          .eq('employee_id', user.id)
          .eq('date', todayStr)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
       
       if (data) {
           setCurrentRecordId(data.id);
           if (data.check_in) {
               setCheckedIn(true);
               setCheckInTime(new Date(data.check_in));
           }
           if (data.check_out) {
               setCheckedOut(true);
               setCheckOutTime(new Date(data.check_out));
           }
       }
    };
    fetchToday();
  }, [isDemoMode, user.id]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const shift = SHIFTS[user.shift];
  const qrData = JSON.stringify({
    employee_id: user.employee_id,
    name: user.full_name,
    department: user.department,
    timestamp: new Date().toISOString(),
    type: checkedIn ? 'checkout' : 'checkin',
  });

  const handleScan = () => {
    setScanning(true);
    setTimeout(async () => {
      const timeNow = new Date();
      if (!checkedIn) {
        let attId = null;
        if (!isDemoMode) {
          const dateStr = timeNow.toISOString().split('T')[0];
          const { data } = await supabase.from('attendance').insert({
            employee_id: user.id,
            employee_name: user.full_name,
            department: user.department,
            date: dateStr,
            check_in: timeNow.toISOString(),
            status: 'present'
          }).select().single();
          if (data) attId = data.id;
        }
        
        setCheckedIn(true);
        setCheckInTime(timeNow);
        if (attId) setCurrentRecordId(attId);
      } else {
        const diff = (timeNow - checkInTime) / (1000 * 60 * 60);
        if (!isDemoMode && currentRecordId) {
             await supabase.from('attendance').update({
                 check_out: timeNow.toISOString(),
                 working_hours: Number(diff.toFixed(2))
             }).eq('id', currentRecordId);
        }
        
        setCheckedOut(true);
        setCheckOutTime(timeNow);
      }
      setScanning(false);
    }, 1500);
  };

  const getWorkingHours = () => {
    if (!checkInTime) return '0.00';
    const end = checkOutTime || currentTime;
    const diff = (end - checkInTime) / (1000 * 60 * 60);
    return diff.toFixed(2);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Live Clock */}
      <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
        <div className="card-body">
          <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFeatureSettings: '"tnum"', color: 'var(--text-primary)' }}>
            {currentTime.toLocaleTimeString('en-US', { hour12: true })}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            {formatDate(currentTime)} — {shift?.label} ({shift?.start} - {shift?.end})
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'center' }}>
          <h3>
            {checkedOut ? '✅ Shift Complete' : checkedIn ? 'Ready to Check Out' : 'Ready to Check In'}
          </h3>
        </div>
        <div className="qr-section">
          <div className="qr-code-wrapper">
            <QRCodeSVG
              value={qrData}
              size={200}
              level="H"
              fgColor={checkedOut ? '#22c55e' : '#0a0e1a'}
              bgColor="white"
              includeMargin
            />
          </div>

          <div className="qr-status">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {user.full_name} — {user.employee_id}
            </p>
          </div>

          {!checkedOut && (
            <button
              className={`btn ${checkedIn ? 'btn-warning' : 'btn-primary'}`}
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              onClick={handleScan}
              disabled={scanning}
              id="qr-scan-btn"
            >
              {scanning ? (
                <span className="spinner" />
              ) : checkedIn ? (
                <><LogOut size={18} /> Check Out</>
              ) : (
                <><LogIn size={18} /> Check In</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Status Summary */}
      {(checkedIn || checkedOut) && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LogIn size={15} color="#22c55e" /> Check In Time
                </span>
                <span style={{ fontWeight: 700, color: 'var(--accent-success)' }}>
                  {formatTime(checkInTime)}
                </span>
              </div>
              {checkedOut && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LogOut size={15} color="#f59e0b" /> Check Out Time
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-warning)' }}>
                    {formatTime(checkOutTime)}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={15} color="#6366f1" /> Working Hours
                </span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-primary-hover)' }}>
                  {getWorkingHours()}h
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
