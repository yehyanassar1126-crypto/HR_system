export const DEPARTMENTS = ['Production', 'Warehouse', 'Administration', 'Packaging'];

export const SHIFTS = {
  morning: { label: 'Morning Shift', start: '06:00', end: '14:00', hours: 8 },
  evening: { label: 'Evening Shift', start: '14:00', end: '22:00', hours: 8 },
  night: { label: 'Night Shift', start: '22:00', end: '06:00', hours: 8 },
};

export const LEAVE_TYPES = ['Annual', 'Sick', 'Emergency', 'Unpaid', 'Maternity/Paternity'];

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const OVERTIME_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ROLES = {
  HR: 'hr',
  EMPLOYEE: 'employee',
};

export const NOTIFICATION_TYPES = {
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  LEAVE_REQUEST: 'leave_request',
  SALARY_READY: 'salary_ready',
  OVERTIME_APPROVED: 'overtime_approved',
  OVERTIME_REJECTED: 'overtime_rejected',
  ANNOUNCEMENT: 'announcement',
  SHIFT_CHANGE: 'shift_change',
  ACTION_REQUIRED: 'action_required',
};

export const PERFORMANCE_RATINGS = [
  { value: 1, label: 'Poor', color: '#ef4444' },
  { value: 2, label: 'Below Average', color: '#f97316' },
  { value: 3, label: 'Average', color: '#eab308' },
  { value: 4, label: 'Good', color: '#22c55e' },
  { value: 5, label: 'Excellent', color: '#06b6d4' },
];
