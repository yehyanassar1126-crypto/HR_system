// ===== HELPER FUNCTIONS =====
function formatDate(date) {
  if (!date) return '—';
  var d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function formatTime(date) {
  if (!date) return '—';
  var d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTime(date) {
  if (!date) return '—';
  var d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().substring(0, 2);
}

function calculateInsuranceDuration(startDate) {
  if (!startDate) return { years: 0, months: 0, days: 0, totalDays: 0 };
  var start = new Date(startDate);
  var now = new Date();
  var totalDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  var years = Math.floor(totalDays / 365);
  var months = Math.floor((totalDays % 365) / 30);
  var days = totalDays % 30;
  return { years: years, months: months, days: days, totalDays: totalDays };
}

function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  var headers = Object.keys(data[0]);
  var csv = [
    headers.join(','),
  ].concat(data.map(function(row) {
    return headers.map(function(h) { return '"' + (row[h] != null ? row[h] : '') + '"'; }).join(',');
  })).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Toast notification system
var toastContainer = null;
function showToast(message, type) {
  type = type || 'info';
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3500);
}
