import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isDemoMode } from '../supabaseClient';
import { mockEmployees, mockHRUser, mockAuditLog } from '../utils/mockData';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('hr_portal_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    if (isDemoMode) {
      // Demo mode login
      if (username === 'hr' && password === 'hr123') {
        const u = { ...mockHRUser };
        setUser(u);
        localStorage.setItem('hr_portal_user', JSON.stringify(u));
        return { success: true, user: u };
      }
      const emp = mockEmployees.find(e => e.username === username);
      if (emp && password === 'emp123') {
        setUser(emp);
        localStorage.setItem('hr_portal_user', JSON.stringify(emp));
        return { success: true, user: emp };
      }
      return { success: false, error: 'Invalid credentials. Demo: hr/hr123 or ahmed/emp123' };
    }

    // Supabase mode
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) return { success: false, error: 'Invalid credentials' };

      // In production, use proper password hashing comparison
      // For now, we compare directly (Supabase should handle auth)
      if (data.password_hash !== password) {
        return { success: false, error: 'Invalid credentials' };
      }

      const userData = { ...data };
      delete userData.password_hash;
      setUser(userData);
      localStorage.setItem('hr_portal_user', JSON.stringify(userData));

      // Log the login
      await supabase.from('audit_log').insert({
        action: 'LOGIN',
        user_name: data.full_name,
        details: `${data.role === 'hr' ? 'HR' : 'Employee'} user logged in`,
        user_id: data.id,
      });

      return { success: true, user: userData };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('hr_portal_user');
  }, []);

  const isHR = user?.role === 'hr';

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isHR }}>
      {children}
    </AuthContext.Provider>
  );
}
