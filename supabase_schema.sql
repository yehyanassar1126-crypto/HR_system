-- ============================================================
-- Smart Factory HR & Workforce Management System
-- Supabase Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS / EMPLOYEES TABLE
-- ============================================================
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('hr', 'employee')),
  department TEXT NOT NULL CHECK (department IN ('Production', 'Warehouse', 'Administration', 'Packaging')),
  position TEXT,
  phone TEXT,
  hire_date DATE,
  base_salary NUMERIC(10, 2) DEFAULT 0,
  shift TEXT DEFAULT 'morning' CHECK (shift IN ('morning', 'evening', 'night')),
  insurance_start DATE,
  insurance_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  avatar_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ATTENDANCE TABLE
-- ============================================================
CREATE TABLE attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  shift TEXT,
  delay_minutes INTEGER DEFAULT 0,
  working_hours NUMERIC(5, 2) DEFAULT 0,
  status TEXT DEFAULT 'absent' CHECK (status IN ('present', 'checked_in', 'absent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. LEAVE REQUESTS TABLE
-- ============================================================
CREATE TABLE leave_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  type TEXT NOT NULL CHECK (type IN ('Annual', 'Sick', 'Emergency', 'Unpaid', 'Maternity/Paternity')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. OVERTIME TABLE
-- ============================================================
CREATE TABLE overtime (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  date DATE NOT NULL,
  hours NUMERIC(4, 2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rate NUMERIC(3, 1) DEFAULT 1.5,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PAYROLL TABLE
-- ============================================================
CREATE TABLE payroll (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  month TEXT NOT NULL, -- Format: YYYY-MM
  base_salary NUMERIC(10, 2) DEFAULT 0,
  overtime_pay NUMERIC(10, 2) DEFAULT 0,
  bonuses NUMERIC(10, 2) DEFAULT 0,
  performance_bonus NUMERIC(10, 2) DEFAULT 0,
  penalties NUMERIC(10, 2) DEFAULT 0,
  late_deductions NUMERIC(10, 2) DEFAULT 0,
  absence_deductions NUMERIC(10, 2) DEFAULT 0,
  net_salary NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'paid')),
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ANNOUNCEMENTS TABLE
-- ============================================================
CREATE TABLE announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by TEXT,
  department TEXT DEFAULT 'All',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. AUDIT LOG TABLE
-- ============================================================
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  user_name TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details TEXT,
  ip TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users: employees can only see their own data, HR can see all
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users insert policy" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update policy" ON users FOR UPDATE USING (true);
CREATE POLICY "Users delete policy" ON users FOR DELETE USING (true);

-- Attendance: employees see own, HR sees all
CREATE POLICY "Attendance view policy" ON attendance
  FOR SELECT USING (true);

CREATE POLICY "Attendance insert policy" ON attendance
  FOR INSERT WITH CHECK (true);

-- Leave requests: employees see own, HR sees all
CREATE POLICY "Leave requests view" ON leave_requests
  FOR SELECT USING (true);

CREATE POLICY "Leave requests insert" ON leave_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Leave requests update" ON leave_requests
  FOR UPDATE USING (true);

-- Overtime policies
CREATE POLICY "Overtime view" ON overtime FOR SELECT USING (true);
CREATE POLICY "Overtime insert" ON overtime FOR INSERT WITH CHECK (true);
CREATE POLICY "Overtime update" ON overtime FOR UPDATE USING (true);

-- Payroll: employees see own, HR sees all
CREATE POLICY "Payroll view" ON payroll FOR SELECT USING (true);
CREATE POLICY "Payroll insert" ON payroll FOR INSERT WITH CHECK (true);
CREATE POLICY "Payroll update" ON payroll FOR UPDATE USING (true);

-- Notifications: users see only their own
CREATE POLICY "Notifications view own" ON notifications
  FOR SELECT USING (true);
CREATE POLICY "Notifications insert" ON notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Notifications update" ON notifications
  FOR UPDATE USING (true);

-- Announcements: everyone can read
CREATE POLICY "Announcements read" ON announcements FOR SELECT USING (true);
CREATE POLICY "Announcements insert" ON announcements FOR INSERT WITH CHECK (true);

-- Audit log: HR only
CREATE POLICY "Audit log read" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Audit log insert" ON audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);
CREATE INDEX idx_overtime_employee ON overtime(employee_id);
CREATE INDEX idx_payroll_employee ON payroll(employee_id);
CREATE INDEX idx_payroll_month ON payroll(month);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- ============================================================
-- 11. ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;

-- Initial Admin Account
INSERT INTO users (employee_id, full_name, email, username, password_hash, role, department, position, base_salary, shift, insurance_active, status, avatar_color) VALUES ('HR-001', 'Admin HR', 'hr@factory.com', 'hr', 'hr123', 'hr', 'Administration', 'HR Manager', 15000, 'morning', true, 'active', '#6366f1') ON CONFLICT DO NOTHING;
