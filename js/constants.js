// ===== APP CONSTANTS =====
var DEPARTMENTS = ['Production', 'Warehouse', 'Administration', 'Packaging', 'Engineering'];

// Shift systems: 2-shift (12h each) or 3-shift (8h each)
var SHIFT_SYSTEMS = {
  '2-shift': { label: '2-Shift (12h)', shifts: ['day', 'night'] },
  '3-shift': { label: '3-Shift (8h)', shifts: ['morning', 'evening', 'night'] }
};

var SHIFTS = {
  // 2-shift system (12 hours each)
  day:     { label: 'Day Shift',     start: '06:00', end: '18:00', hours: 12, system: '2-shift' },
  // 3-shift system (8 hours each)
  morning: { label: 'Morning Shift', start: '06:00', end: '14:00', hours: 8,  system: '3-shift' },
  evening: { label: 'Evening Shift', start: '14:00', end: '22:00', hours: 8,  system: '3-shift' },
  // Night shift shared: 8h in 3-shift, 12h in 2-shift
  night:   { label: 'Night Shift',   start: '22:00', end: '06:00', hours: 8,  system: '3-shift' }
};

// Helper to get the correct night shift config based on system
function getShiftConfig(shiftKey, shiftSystem) {
  if (shiftKey === 'night' && shiftSystem === '2-shift') {
    return { label: 'Night Shift', start: '18:00', end: '06:00', hours: 12, system: '2-shift' };
  }
  if (shiftKey === 'day') {
    return SHIFTS.day;
  }
  return SHIFTS[shiftKey] || SHIFTS.morning;
}

// Get available shifts for a given system
function getShiftsForSystem(system) {
  if (system === '2-shift') {
    return [
      { key: 'day',   label: 'Day Shift (06:00 - 18:00)' },
      { key: 'night', label: 'Night Shift (18:00 - 06:00)' }
    ];
  }
  return [
    { key: 'morning', label: 'Morning Shift (06:00 - 14:00)' },
    { key: 'evening', label: 'Evening Shift (14:00 - 22:00)' },
    { key: 'night',   label: 'Night Shift (22:00 - 06:00)' }
  ];
}

var LEAVE_TYPES = ['Annual', 'Sick', 'Emergency', 'Unpaid', 'Maternity/Paternity'];
