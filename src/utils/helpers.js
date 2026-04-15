import { format, differenceInMinutes, differenceInDays, parseISO, isToday } from 'date-fns';

export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM dd, yyyy');
}

export function formatTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'hh:mm a');
}

export function formatDateTime(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM dd, yyyy hh:mm a');
}

export function calculateWorkingHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
  return Math.max(0, Math.round((mins / 60) * 100) / 100);
}

export function calculateDelay(actualCheckIn, shiftStart) {
  if (!actualCheckIn || !shiftStart) return 0;
  const today = format(new Date(actualCheckIn), 'yyyy-MM-dd');
  const scheduled = new Date(`${today}T${shiftStart}:00`);
  const actual = new Date(actualCheckIn);
  const delayMins = differenceInMinutes(actual, scheduled);
  return Math.max(0, delayMins);
}

export function calculateInsuranceDuration(startDate) {
  if (!startDate) return { years: 0, months: 0, days: 0 };
  const start = new Date(startDate);
  const now = new Date();
  const totalDays = differenceInDays(now, start);
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  return { years, months, days, totalDays };
}

export function calculateSalary({
  baseSalary = 0,
  overtimeHours = 0,
  overtimeRate = 1.5,
  bonuses = 0,
  penalties = 0,
  lateDeductions = 0,
  absenceDeductions = 0,
  performanceBonus = 0,
}) {
  const hourlyRate = baseSalary / (22 * 8); // 22 working days, 8 hours each
  const overtimePay = overtimeHours * hourlyRate * overtimeRate;
  const grossSalary = baseSalary + overtimePay + bonuses + performanceBonus;
  const totalDeductions = penalties + lateDeductions + absenceDeductions;
  const netSalary = grossSalary - totalDeductions;

  return {
    baseSalary,
    overtimePay: Math.round(overtimePay * 100) / 100,
    bonuses,
    performanceBonus,
    grossSalary: Math.round(grossSalary * 100) / 100,
    penalties,
    lateDeductions,
    absenceDeductions,
    totalDeductions,
    netSalary: Math.round(Math.max(0, netSalary) * 100) / 100,
  };
}

export function generateEmployeeId() {
  return 'EMP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function getStatusColor(status) {
  switch (status) {
    case 'approved': return '#22c55e';
    case 'rejected': return '#ef4444';
    case 'pending': return '#f59e0b';
    default: return '#6b7280';
  }
}

export function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
