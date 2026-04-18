// ===== MAIN APP CONTROLLER =====
var App = {
  user: null,
  activePage: 'dashboard',
  notifications: [],

  init: function() {
    App.user = null;
    localStorage.removeItem('hr_portal_user');
    if (App.user) {
      App.loadNotifications();
      App.renderApp();
    } else {
      App.renderLogin();
    }
  },

  // ========== AUTH ==========
  login: function(username, password) {
    
    // Supabase mode
    sbClient.from('users').select('*').eq('username', username).single().then(function(res) {
      if (res.error || !res.data) { App.showLoginError('Invalid credentials'); return; }
      if (res.data.password_hash !== password) { App.showLoginError('Invalid credentials'); return; }
      var userData = Object.assign({}, res.data);
      delete userData.password_hash;
      App.user = userData;
      localStorage.setItem('hr_portal_user', JSON.stringify(App.user));
      App.loadNotifications();
      App.renderApp();
      // Log login
      sbClient.from('audit_log').insert({ action: 'LOGIN', user_name: res.data.full_name, details: res.data.role.toUpperCase() + ' user logged in', user_id: res.data.id }).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
    });
  },

  logout: function() {
    App.user = null;
    localStorage.removeItem('hr_portal_user');
    App.notifications = [];
    App.renderLogin();
  },

  toggleSidebar: function() {
    var s = document.getElementById('sidebar');
    var o = document.getElementById('mobile-overlay');
    if(s) s.classList.toggle('open');
    if(o) o.classList.toggle('open');
  },

  closeSidebar: function() {
    var s = document.getElementById('sidebar');
    var o = document.getElementById('mobile-overlay');
    if(s) s.classList.remove('open');
    if(o) o.classList.remove('open');
  },

  isHR: function() { return App.user && ['owner', 'hr manager', 'hr'].indexOf(App.user.role) !== -1; },
  isManager: function() { return App.user && ['hall manager', 'department head'].indexOf(App.user.role) !== -1; },
  getRoleLevel: function(r) { return r==='owner'?6 : r==='hr manager'?5 : r==='hr'?4 : r==='hall manager'?3 : r==='department head'?2 : 1; },

  showLoginError: function(msg) {
    var el = document.getElementById('login-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  },

  // ========== NOTIFICATIONS ==========
  loadNotifications: function() {
    if (!App.user) return;
    sbClient.from('notifications').select('*').eq('user_id', App.user.id).order('created_at', { ascending: false }).limit(50).then(function(res) {
      if (res.data) App.notifications = res.data;
      App.updateNotifBadge();
    });
  },

  addNotification: function(notif) {
    var newNotif = Object.assign({ read: false, created_at: new Date().toISOString() }, notif);
    if (notif.user_id === App.user.id) {
      App.notifications.unshift(newNotif);
    }
    {
      sbClient.from('notifications').insert(notif).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
    }
    App.updateNotifBadge();
  },

  getUnreadCount: function() {
    return App.notifications.filter(function(n) { return !n.read; }).length;
  },

  updateNotifBadge: function() {
    var count = App.getUnreadCount();
    var badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  markNotifRead: function(id) {
    App.notifications = App.notifications.map(function(n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; });
    sbClient.from('notifications').update({ read: true }).eq('id', id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
    App.updateNotifBadge();
  },

  markAllRead: function() {
    App.notifications = App.notifications.map(function(n) { return Object.assign({}, n, { read: true }); });
    if (App.user) sbClient.from('notifications').update({ read: true }).eq('user_id', App.user.id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
    App.updateNotifBadge();
    App.showNotifPanel();
  },

  // ========== RENDERING ==========
  renderLogin: function() {
    document.getElementById('app').innerHTML = '<div class="login-wrapper"><div class="login-bg"></div><div class="login-card">' +
      '<div class="login-logo"><div class="login-logo-icon">' + icon('factory', 30) + '</div><h1>Smart Factory</h1><p>HR & Workforce Management System</p></div>' +
      '<form class="login-form" id="login-form">' +
      '<div id="login-error" class="login-error" style="display:none"></div>' +
      '<div class="form-group"><label class="form-label">Username</label><div class="form-input-wrapper"><input type="text" class="form-input" placeholder="Enter your username" id="login-username" autofocus>' +
      '<span class="form-input-icon">' + icon('user') + '</span></div></div>' +
      '<div class="form-group"><label class="form-label">Password</label><div class="form-input-wrapper"><input type="password" class="form-input" placeholder="Enter your password" id="login-password">' +
      '<span class="form-input-icon">' + icon('lock') + '</span></div></div>' +
      '<button type="submit" class="login-btn" id="login-submit">Sign In</button></form>' +
      
      '</div></div>';

    document.getElementById('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var u = document.getElementById('login-username').value.trim();
      var p = document.getElementById('login-password').value.trim();
      if (!u || !p) { App.showLoginError('Please fill in all fields'); return; }
      document.getElementById('login-error').style.display = 'none';
      App.login(u, p);
    });
  },

  renderApp: function() {
    var isHR = App.isHR();
    document.getElementById('app').innerHTML = '<div class="app-layout">' +
      '<div class="mobile-overlay" id="mobile-overlay"></div>' +
      '<aside class="sidebar" id="sidebar"></aside>' +
      '<div class="main-content"><header class="header" id="header"></header><div class="page-content" id="page-content"></div></div>' +
      '</div><div id="notif-panel-container"></div><div id="modal-container"></div>';

    document.getElementById('mobile-overlay').addEventListener('click', App.closeSidebar);

    App.renderSidebar();
    App.renderHeader();
    App.navigate(App.activePage);
  },

  navigate: function(page) {
    App.activePage = page;
    App.renderSidebar();
    App.renderHeader();
    App.renderPage();
  },

  // ========== SIDEBAR ==========
  renderSidebar: function() {
    var isHR = App.isHR();
    var isManager = App.isManager();
    var menu;
    if (isHR) {
      menu = [
        { section: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'layoutDashboard' }] },
        { section: 'Management', items: [
          { id: 'employees', label: 'Employees', icon: 'users' },
          { id: 'attendance', label: 'Attendance', icon: 'calendarCheck' },
          { id: 'leaves', label: 'Leave Requests', icon: 'calendarDays' },
          { id: 'shifts', label: 'Shift Management', icon: 'clock' },
          { id: 'overtime', label: 'Overtime', icon: 'timer' },
          { id: 'payroll', label: 'Payroll', icon: 'dollarSign' },
          { id: 'hr-adjustments', label: 'Salary Adjustments', icon: 'fileText' },
        ]},
        { section: 'Communication', items: [{ id: 'announcements', label: 'Announcements', icon: 'megaphone' }] },
        { section: 'Analytics', items: [
          { id: 'reports', label: 'Reports', icon: 'barChart' },
          { id: 'audit-log', label: 'Audit Log', icon: 'fileText' },
        ]},
      ];
    } else if (isManager) {
      menu = [
        { section: 'Overview', items: [{ id: 'dashboard', label: 'My Dashboard', icon: 'layoutDashboard' }] },
        { section: 'Team Management', items: [
          { id: 'employees', label: 'Employees', icon: 'users' },
          { id: 'team-adjustments', label: 'Team Adjustments', icon: 'fileText' },
        ]},
        { section: 'My Info', items: [
          { id: 'my-attendance', label: 'My Attendance', icon: 'calendarCheck' },
          { id: 'qr-checkin', label: 'QR Check-In', icon: 'qrCode' },
          { id: 'my-leaves', label: 'My Leaves', icon: 'calendarDays' },
          { id: 'my-salary', label: 'My Salary', icon: 'dollarSign' },
          { id: 'my-overtime', label: 'My Overtime', icon: 'timer' },
        ]},
        { section: 'Other', items: [{ id: 'announcements', label: 'Announcements', icon: 'megaphone' }] },
      ];
    } else {
      menu = [
        { section: 'Overview', items: [{ id: 'dashboard', label: 'My Dashboard', icon: 'layoutDashboard' }] },
        { section: 'My Info', items: [
          { id: 'my-attendance', label: 'My Attendance', icon: 'calendarCheck' },
          { id: 'qr-checkin', label: 'QR Check-In', icon: 'qrCode' },
          { id: 'my-leaves', label: 'My Leaves', icon: 'calendarDays' },
          { id: 'my-salary', label: 'My Salary', icon: 'dollarSign' },
          { id: 'my-overtime', label: 'My Overtime', icon: 'timer' },
        ]},
        { section: 'Other', items: [{ id: 'announcements', label: 'Announcements', icon: 'megaphone' }] },
      ];
    }

    var html = '<div class="sidebar-header"><div class="sidebar-logo">' + icon('factory', 20) + '</div><div class="sidebar-brand"><h2>Smart Factory</h2><p>HR Management</p></div></div>';
    html += '<nav class="sidebar-nav">';
    menu.forEach(function(section) {
      html += '<div class="sidebar-section"><div class="sidebar-section-title">' + section.section + '</div>';
      section.items.forEach(function(item) {
        html += '<button class="sidebar-item' + (App.activePage === item.id ? ' active' : '') + '" data-page="' + item.id + '" id="nav-' + item.id + '">' +
          '<span class="sidebar-item-icon">' + icon(item.icon) + '</span><span>' + item.label + '</span></button>';
      });
      html += '</div>';
    });
    html += '</nav>';
    html += '<div class="sidebar-footer"><div class="sidebar-user">' +
      '<div class="sidebar-avatar" style="background:' + (App.user.avatar_color || '#6366f1') + '">' + getInitials(App.user.full_name) + '</div>' +
      '<div class="sidebar-user-info"><h4>' + App.user.full_name + '</h4><p>' + App.user.position + '</p></div>' +
      '<button class="sidebar-logout" id="logout-btn" title="Sign out">' + icon('logOut') + '</button></div></div>';

    document.getElementById('sidebar').innerHTML = html;

    // Bind events
    document.querySelectorAll('.sidebar-item').forEach(function(btn) {
      btn.addEventListener('click', function() { App.navigate(this.getAttribute('data-page')); App.closeSidebar(); });
    });
    document.getElementById('logout-btn').addEventListener('click', App.logout);
  },

  // ========== HEADER ==========
  renderHeader: function() {
    var titles = {
      'dashboard': { title: 'Dashboard', sub: 'Overview & Analytics' },
      'employees': { title: 'Employee Management', sub: 'Manage all employees' },
      'attendance': { title: 'Attendance', sub: 'Track employee attendance' },
      'leaves': { title: 'Leave Management', sub: 'Handle leave requests' },
      'shifts': { title: 'Shift Management', sub: 'Morning, Evening & Night shifts' },
      'overtime': { title: 'Overtime Management', sub: 'Track & approve overtime' },
      'payroll': { title: 'Payroll', sub: 'Salary processing & reports' },
      'announcements': { title: 'Announcements', sub: 'Company-wide messages' },
      'reports': { title: 'Reports & Analytics', sub: 'Insights & data export' },
      'audit-log': { title: 'Audit Log', sub: 'System activity tracking' },
      'my-attendance': { title: 'My Attendance', sub: 'Your attendance records' },
      'qr-checkin': { title: 'QR Check-In / Out', sub: 'Scan to check in or out' },
      'my-leaves': { title: 'My Leaves', sub: 'Your leave requests' },
      'my-salary': { title: 'My Salary', sub: 'Your salary details' },
      'my-overtime': { title: 'My Overtime', sub: 'Your overtime records' },
      'team-adjustments': { title: 'Team Adjustments', sub: 'Submit bonuses & penalties for your team' },
      'hr-adjustments': { title: 'Salary Adjustments', sub: 'Approve or reject manager requests' },
    };
    var page = titles[App.activePage] || { title: 'Dashboard', sub: '' };
    var unread = App.getUnreadCount();

    document.getElementById('header').innerHTML =
      '<div class="header-left"><button class="menu-toggle" id="menu-toggle" style="display:flex !important; position:absolute !important; right:12px !important; z-index:999 !important; background:#6366f1 !important; color:#fff !important; width:44px !important; height:44px !important; border-radius:8px !important; border:none !important;">' + icon('menu') + '</button><div class="header-title"><h2>' + page.title + '</h2><p>' + page.sub + '</p></div></div>' +
      '<div class="header-right"><button class="btn btn-sm btn-outline" id="lang-toggle-btn" style="margin-right:14px">' + (localStorage.getItem('lang') === 'ar' ? 'English' : 'عربي') + '</button><button class="header-btn" id="notif-toggle" title="Notifications">' + icon('bell') +
      '<span class="notif-badge" id="notif-badge" style="display:' + (unread > 0 ? 'flex' : 'none') + '">' + (unread > 9 ? '9+' : unread) + '</span></button></div>';

    document.getElementById('menu-toggle').addEventListener('click', App.toggleSidebar);
    document.getElementById('notif-toggle').addEventListener('click', function() { App.showNotifPanel(); });
    document.getElementById('lang-toggle-btn').addEventListener('click', function() { var curr = localStorage.getItem('lang'); if (curr === 'ar') { localStorage.setItem('lang', 'en'); document.body.classList.remove('rtl-layout'); } else { localStorage.setItem('lang', 'ar'); document.body.classList.add('rtl-layout'); } window.location.reload(); });
  },

  // ========== NOTIFICATION PANEL ==========
  showNotifPanel: function() {
    var unread = App.getUnreadCount();
    var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99" id="notif-overlay"></div>' +
      '<div class="notif-panel"><div class="notif-panel-header"><h3>🔔 Notifications</h3><div style="display:flex;gap:8px">';
    if (unread > 0) html += '<button class="btn btn-xs btn-outline" id="mark-all-read">' + icon('checkCheck') + ' Mark all read</button>';
    html += '<button class="modal-close" id="close-notif">' + icon('x') + '</button></div></div>';
    html += '<div class="notif-panel-body">';
    if (App.notifications.length === 0) {
      html += '<div class="notif-empty">' + icon('bellOff') + '<p>No notifications yet</p></div>';
    } else {
      App.notifications.forEach(function(n) {
        html += '<div class="notif-item' + (!n.read ? ' unread' : '') + '" data-notif-id="' + n.id + '"><div class="notif-item-title">' + n.title + '</div><div class="notif-item-msg">' + n.message + '</div><div class="notif-item-time">' + formatDateTime(n.created_at) + '</div></div>';
      });
    }
    html += '</div></div>';
    document.getElementById('notif-panel-container').innerHTML = html;

    document.getElementById('notif-overlay').addEventListener('click', function() { document.getElementById('notif-panel-container').innerHTML = ''; });
    document.getElementById('close-notif').addEventListener('click', function() { document.getElementById('notif-panel-container').innerHTML = ''; });
    var markAllBtn = document.getElementById('mark-all-read');
    if (markAllBtn) markAllBtn.addEventListener('click', function() { App.markAllRead(); });
    document.querySelectorAll('.notif-item').forEach(function(item) {
      item.addEventListener('click', function() { App.markNotifRead(this.getAttribute('data-notif-id')); this.classList.remove('unread'); });
    });
  },

  // ========== PAGE ROUTER ==========
  renderPage: function() {
    var el = document.getElementById('page-content');
    switch (App.activePage) {
      case 'dashboard': App.isHR() ? Pages.hrDashboard(el) : Pages.empDashboard(el); break;
      case 'employees': (App.isHR() || App.isManager()) ? Pages.employees(el) : Pages.empDashboard(el); break;
      case 'attendance': case 'my-attendance': Pages.attendance(el); break;
      case 'qr-checkin': Pages.qrCheckin(el); break;
      case 'leaves': case 'my-leaves': Pages.leaves(el); break;
      case 'shifts': App.isHR() ? Pages.shifts(el) : Pages.empDashboard(el); break;
      case 'overtime': case 'my-overtime': Pages.overtime(el); break;
      case 'payroll': case 'my-salary': Pages.payroll(el); break;
      case 'announcements': Pages.announcements(el); break;
      case 'reports': App.isHR() ? Pages.reports(el) : Pages.empDashboard(el); break;
      case 'audit-log': App.isHR() ? Pages.auditLog(el) : Pages.empDashboard(el); break;
      case 'team-adjustments': Pages.teamAdjustments(el); break;
      case 'hr-adjustments': App.isHR() ? Pages.hrAdjustments(el) : Pages.empDashboard(el); break;
      default: App.isHR() ? Pages.hrDashboard(el) : Pages.empDashboard(el);
    }
  },

  // ========== MODAL HELPER ==========
  showModal: function(title, bodyHtml, footerHtml, isLg) {
    var mc = document.getElementById('modal-container');
    mc.innerHTML = '<div class="modal-overlay" id="modal-overlay"><div class="modal' + (isLg ? ' modal-lg' : '') + '" onclick="event.stopPropagation()">' +
      '<div class="modal-header"><h3>' + title + '</h3><button class="modal-close" id="modal-close-btn">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      (footerHtml ? '<div class="modal-footer">' + footerHtml + '</div>' : '') +
      '</div></div>';
    document.getElementById('modal-overlay').addEventListener('click', function(e) { if (e.target === this) App.closeModal(); });
    document.getElementById('modal-close-btn').addEventListener('click', App.closeModal);
  },

  closeModal: function() { document.getElementById('modal-container').innerHTML = ''; },
};

// ========== ALL PAGES ==========
var Pages = {};

// ----- HR DASHBOARD -----
Pages.hrDashboard = function(el) {
  el.innerHTML = '<div style="padding:60px;text-align:center"><span class="spinner" style="margin-bottom:16px;"></span><p>Loading Dashboard...</p></div>';

  var tds = todayStr();
  var myLevel = App.getRoleLevel(App.user ? App.user.role : 'hr');
  var allowedRoles = [];
  if (myLevel >= 6) allowedRoles.push('hr manager', 'hr', 'hall manager', 'department head', 'employee');
  if (myLevel >= 5) allowedRoles.push('hr', 'hall manager', 'department head', 'employee');
  if (myLevel >= 4) allowedRoles.push('hall manager', 'department head', 'employee');
  if (myLevel >= 3) allowedRoles.push('department head', 'employee');
  if (myLevel >= 2) allowedRoles.push('employee');
  allowedRoles = allowedRoles.filter(function(item, pos) { return allowedRoles.indexOf(item) === pos; });

  Promise.all([
    sbClient.from('users').select('*').in('role', allowedRoles),
    sbClient.from('attendance').select('*').eq('date', tds),
    sbClient.from('leave_requests').select('*'),
    sbClient.from('overtime').select('*'),
    sbClient.from('payroll').select('*'),
    sbClient.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
  ]).then(function(results) {
    var employees = results[0].data || [];
    var attendance = results[1].data || [];
    var leaves = results[2].data || [];
    var overtime = results[3].data || [];
    var payroll = results[4].data || [];
    var announcements = results[5].data || [];

    var totalEmployees = employees.length;
    var presentToday = attendance.filter(function(a) { return a.status === 'present' || a.status === 'checked_in'; }).length;
    var absentToday = totalEmployees - presentToday;
    var pendingLeaves = leaves.filter(function(l) { return l.status === 'pending'; }).length;
    var pendingOvertime = overtime.filter(function(o) { return o.status === 'pending'; }).length;
    var totalPayroll = payroll.reduce(function(s, p) { return s + p.net_salary; }, 0);

    var html = '<div class="stats-grid">';
    html += _statCard('#6366f1', 'users', totalEmployees, 'Total Employees');
    html += _statCard('#22c55e', 'userCheck', presentToday, 'Present Today');
    html += _statCard('#ef4444', 'userX', absentToday, 'Absent Today');
    html += _statCard('#f59e0b', 'calendarCheck', pendingLeaves, 'Pending Leave Requests');
    html += _statCard('#06b6d4', 'clock', pendingOvertime, 'Pending Overtime');
    html += _statCard('#a855f7', 'dollarSign', 'EGP ' + totalPayroll.toLocaleString(), 'Total Payroll (This Month)');
    html += '</div>';

    html += '<div class="grid-2" style="margin-bottom:24px">';
    html += '<div class="card"><div class="card-header"><div><h3>Today\'s Attendance</h3><p>Employee check-in status overview</p></div></div><div class="chart-container" style="height:260px"><canvas id="chart-attendance"></canvas></div></div>';
    html += '<div class="card"><div class="card-header"><div><h3>Department Distribution</h3><p>Employees per department</p></div></div><div class="chart-container" style="height:260px"><canvas id="chart-dept"></canvas></div></div>';
    html += '</div>';

    html += '<div class="grid-2">';
    html += '<div class="card"><div class="card-header"><div><h3>Pending Leave Requests</h3><p>Awaiting your approval</p></div><button class="btn btn-sm btn-outline" onclick="App.navigate(\'leaves\')">View All</button></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr><th>Employee</th><th>Type</th><th>Days</th><th>Status</th></tr></thead><tbody>';
    var pendingL = leaves.filter(function(l) { return l.status === 'pending'; }).slice(0, 4);
    if (pendingL.length === 0) html += '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px">No pending requests</td></tr>';
    pendingL.forEach(function(l) {
      html += '<tr><td style="color:var(--text-primary);font-weight:500">' + l.employee_name + '</td><td>' + l.type + '</td><td>' + l.days + '</td><td><span class="badge badge-warning"><span class="badge-dot"></span>Pending</span></td></tr>';
    });
    html += '</tbody></table></div></div></div>';

    html += '<div class="card"><div class="card-header"><div><h3>Recent Announcements</h3><p>Latest company updates</p></div><button class="btn btn-sm btn-outline" onclick="App.navigate(\'announcements\')">View All</button></div><div class="card-body" style="display:flex;flex-direction:column;gap:12px">';
    if (announcements.length === 0) html += '<p style="text-align:center;color:var(--text-muted);padding:20px">No announcements</p>';
    announcements.slice(0, 3).forEach(function(a) {
      html += '<div class="announcement-item ' + a.priority + '" style="margin-bottom:0"><div class="announcement-title">' + a.title + '</div><div class="announcement-msg" style="-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">' + a.message + '</div><div class="announcement-meta"><span>' + formatDate(a.created_at) + '</span><span>' + a.department + '</span></div></div>';
    });
    html += '</div></div></div>';

    el.innerHTML = html;

    setTimeout(function() {
      var lateToday = attendance.filter(function(a) { return a.delay_minutes > 0 && a.date === tds; }).length;
      new Chart(document.getElementById('chart-attendance'), {
        type: 'doughnut', data: { labels: ['Present', 'Absent', 'Late'], datasets: [{ data: [presentToday, absentToday, lateToday], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
        options: { cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 12 } } } }, maintainAspectRatio: false }
      });
      var deptCounts = {};
      DEPARTMENTS.forEach(function(d) { deptCounts[d] = 0; });
      employees.forEach(function(e) { deptCounts[e.department] = (deptCounts[e.department] || 0) + 1; });
      new Chart(document.getElementById('chart-dept'), {
        type: 'bar', data: { labels: Object.keys(deptCounts), datasets: [{ data: Object.values(deptCounts), backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b', '#22c55e'], borderWidth: 0, borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#64748b' }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: 'rgba(148,163,184,0.06)' }, border: { display: false } } } }
      });
    }, 50);
  });
};

Pages.empDashboard = function(el) {
  var user = App.user;
  el.innerHTML = '<div style="padding:60px;text-align:center"><span class="spinner" style="margin-bottom:16px;"></span><p>Loading Your Dashboard...</p></div>';

  Promise.all([
    sbClient.from('attendance').select('*').eq('employee_id', user.id).eq('date', todayStr()).limit(1).single(),
    sbClient.from('leave_requests').select('*').eq('employee_id', user.id),
    sbClient.from('payroll').select('*').eq('employee_id', user.id).order('month', { ascending: false }).limit(1).single(),
    sbClient.from('overtime').select('hours').eq('employee_id', user.id),
    sbClient.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
  ]).then(function(results) {
    var todayAtt = results[0].data || null;
    var myLeaves = results[1].data || [];
    var latestPay = results[2].data || null;
    var myOvertime = results[3].data || [];
    var announcements = results[4].data || [];

    var pendingL = myLeaves.filter(function(l) { return l.status === 'pending'; }).length;
    var insurance = calculateInsuranceDuration(user.insurance_start);
    var empShiftSystem = user.shift_system || '3-shift';
    var shift = getShiftConfig(user.shift, empShiftSystem);
    var totalOT = myOvertime.reduce(function(s, o) { return s + o.hours; }, 0);
    var hasInsurance = user.insurance_start && user.insurance_active;

    var html = '<div class="profile-header"><div class="profile-avatar" style="background:' + (user.avatar_color||'#6366f1') + '">' + getInitials(user.full_name) + '</div>' +
      '<div class="profile-info"><h2>Welcome back, ' + user.full_name.split(' ')[0] + '! 👋</h2><div class="profile-meta">' +
      '<span>🏢 ' + user.department + '</span><span>💼 ' + user.position + '</span><span>🆔 ' + user.employee_id + '</span>' +
      '<span class="shift-badge shift-' + user.shift + '">' + icon('clock', 12) + ' ' + (shift ? shift.label + ' (' + shift.start + '-' + shift.end + ')' : '') + '</span></div></div></div>';

    html += '<div class="stats-grid">';
    var attStatus = todayAtt ? (todayAtt.check_out ? 'Completed' : 'Checked In') : 'Not Checked In';
    var attColor = todayAtt ? '#22c55e' : '#f59e0b';
    html += '<div class="stat-card" style="--stat-color:' + attColor + ';cursor:pointer" onclick="App.navigate(\'my-attendance\')"><div class="stat-card-header"><div class="stat-card-icon" style="background:' + (todayAtt ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)') + '">' + icon('calendarCheck', 20) + '</div></div><div class="stat-card-value" style="font-size:1.2rem">' + attStatus + '</div><div class="stat-card-label">Today\'s Status</div></div>';
    html += '<div class="stat-card" style="--stat-color:#6366f1;cursor:pointer" onclick="App.navigate(\'my-leaves\')"><div class="stat-card-header"><div class="stat-card-icon" style="background:rgba(99,102,241,0.12)">' + icon('calendarDays', 20) + '</div>' + (pendingL > 0 ? '<span class="stat-card-trend down">' + pendingL + ' pending</span>' : '') + '</div><div class="stat-card-value">' + myLeaves.length + '</div><div class="stat-card-label">Leave Requests</div></div>';
    html += '<div class="stat-card" style="--stat-color:#06b6d4;cursor:pointer" onclick="App.navigate(\'my-salary\')"><div class="stat-card-header"><div class="stat-card-icon" style="background:rgba(6,182,212,0.12)">' + icon('dollarSign', 20) + '</div></div><div class="stat-card-value">EGP ' + (latestPay ? latestPay.net_salary.toLocaleString() : '—') + '</div><div class="stat-card-label">Latest Salary</div></div>';
    html += '<div class="stat-card" style="--stat-color:#a855f7;cursor:pointer" onclick="App.navigate(\'my-overtime\')"><div class="stat-card-header"><div class="stat-card-icon" style="background:rgba(168,85,247,0.12)">' + icon('timer', 20) + '</div></div><div class="stat-card-value">' + totalOT + 'h</div><div class="stat-card-label">Overtime Hours</div></div>';
    html += '</div>';

    html += '<div class="grid-2" style="margin-bottom:24px">';
    if (hasInsurance) {
      html += '<div class="insurance-card"><div style="display:flex;align-items:center;gap:10px">' + icon('shield', 22) + '<div><h3 style="font-size:1rem;font-weight:700">Insurance Status</h3><p style="font-size:0.8rem;color:var(--text-tertiary)">✅ Active — Started ' + formatDate(user.insurance_start) + '</p></div></div>';
      html += '<div class="insurance-grid"><div class="insurance-stat"><div class="value">' + insurance.years + '</div><div class="label">Years</div></div><div class="insurance-stat"><div class="value">' + insurance.months + '</div><div class="label">Months</div></div><div class="insurance-stat"><div class="value">' + insurance.days + '</div><div class="label">Days</div></div><div class="insurance-stat"><div class="value">' + insurance.totalDays + '</div><div class="label">Total Days</div></div></div></div>';
    } else {
      html += '<div style="padding:20px;background:rgba(239,68,68,0.08);border-radius:var(--radius-lg);border:1px solid rgba(239,68,68,0.15)"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:1.5rem">🚫</span><div><h3 style="font-size:1rem;font-weight:700">No Insurance</h3><p style="font-size:0.8rem;color:var(--accent-danger)">Salary divided by 30 working days</p></div></div></div>';
    }

    html += '<div class="card"><div class="card-header"><div><h3>Today\'s Attendance</h3><p>' + formatDate(new Date()) + '</p></div><button class="btn btn-sm btn-primary" onclick="App.navigate(\'qr-checkin\')">QR Check-In ' + icon('arrowRight') + '</button></div><div class="card-body">';
    if (todayAtt) {
      html += '<div style="display:flex;flex-direction:column;gap:14px">';
      html += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-tertiary);font-size:0.82rem">Check In</span><span style="font-weight:600">' + formatTime(todayAtt.check_in) + '</span></div>';
      html += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-tertiary);font-size:0.82rem">Check Out</span><span style="font-weight:600">' + (todayAtt.check_out ? formatTime(todayAtt.check_out) : '—') + '</span></div>';
      html += '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-tertiary);font-size:0.82rem">Working Hours</span><span style="font-weight:600">' + (todayAtt.working_hours || 0) + 'h</span></div>';
      if (todayAtt.delay_minutes > 0) html += '<div style="display:flex;justify-content:space-between"><span style="color:var(--accent-warning);font-size:0.82rem">⚠️ Late by</span><span style="font-weight:600;color:var(--accent-warning)">' + todayAtt.delay_minutes + ' min</span></div>';
      html += '</div>';
    } else {
      html += '<div class="empty-state" style="padding:30px">' + icon('alertTriangle', 32) + '<p>You haven\'t checked in today</p><button class="btn btn-primary btn-sm" onclick="App.navigate(\'qr-checkin\')">Go to QR Check-In</button></div>';
    }
    html += '</div></div></div>';

    html += '<div class="card"><div class="card-header"><div><h3>📢 Recent Announcements</h3><p>Stay updated with the latest news</p></div><button class="btn btn-sm btn-outline" onclick="App.navigate(\'announcements\')">View All</button></div><div class="card-body" style="display:flex;flex-direction:column;gap:12px">';
    var visibleAnnouncements = announcements.filter(function(a) { return a.department === 'All' || a.department.indexOf(user.department) !== -1; }).slice(0, 3);
    if (visibleAnnouncements.length === 0) html += '<p style="color:var(--text-muted);text-align:center;padding:10px 0;">No announcements</p>';
    visibleAnnouncements.forEach(function(a) {
      html += '<div class="announcement-item ' + a.priority + '" style="margin-bottom:0"><div class="announcement-title">' + a.title + '</div><div class="announcement-msg">' + a.message + '</div><div class="announcement-meta"><span>' + formatDate(a.created_at) + '</span></div></div>';
    });
    html += '</div></div>';

    el.innerHTML = html;
  });
};

Pages.employees = function(el) {
  var employees = [];
  var search = '';
  var deptFilter = '';

  var DOC_LIST = [
    "شهاده الميلاد",
    "صوره البطاقه",
    "شهاده المؤهل الدراسي",
    "شهاده الخدمه العسكريه",
    "6 صور 4*6",
    "فيش و تشبيه",
    "برنت تأمينات (لو جاي من شركه تاني)",
    "كعب عمل"
  ];

  function render() {
    var filtered = employees.filter(function(e) {
      var matchSearch = !search || e.full_name.toLowerCase().indexOf(search.toLowerCase()) !== -1 || (e.employee_id && e.employee_id.toLowerCase().indexOf(search.toLowerCase()) !== -1) || (e.email && e.email.toLowerCase().indexOf(search.toLowerCase()) !== -1);
      var matchDept = !deptFilter || e.department === deptFilter;
      return matchSearch && matchDept;
    });

    var html = '<div class="toolbar"><div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search by name, ID or email..." id="emp-search" value="' + (search || '').replace(/"/g, '&quot;') + '"></div>';
    html += '<select class="filter-select" id="emp-dept-filter"><option value="">All Departments</option>';
    DEPARTMENTS.forEach(function(d) { html += '<option value="' + d + '"' + (deptFilter === d ? ' selected' : '') + '>' + d + '</option>'; });
    html += '</select><button class="btn btn-primary" id="add-emp-btn">' + icon('plus') + ' Add Employee</button></div>';

    html += '<div class="card"><div class="card-header"><div><h3>All Employees</h3><p>' + filtered.length + ' employees found</p></div></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr><th>Employee</th><th>ID</th><th>Department</th><th>Position</th><th>Shift System</th><th>Shift</th><th>Status</th><th>Docs</th><th>Actions</th></tr></thead><tbody>';
    filtered.forEach(function(emp) {
      var empEmail = emp.email || 'No email';
      var empShiftSystem = emp.shift_system || '3-shift';
      var shiftConf = getShiftConfig(emp.shift, empShiftSystem);
      var sysLabel = empShiftSystem === '2-shift' ? '2-Shift (12h)' : '3-Shift (8h)';
      html += '<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="sidebar-avatar" style="background:' + (emp.avatar_color||'#6366f1') + ';width:32px;height:32px;font-size:0.7rem">' + getInitials(emp.full_name) + '</div><div><div style="color:var(--text-primary);font-weight:600;font-size:0.85rem">' + emp.full_name + '</div><div style="font-size:0.72rem;color:var(--text-muted)">' + empEmail + '</div></div></div></td>';
      html += '<td><code style="color:var(--accent-primary);font-size:0.78rem">' + emp.employee_id + '</code></td><td>' + emp.department + '</td><td>' + (emp.position || '—') + '</td>';
      html += '<td><span class="badge badge-info" style="font-size:0.72rem">' + sysLabel + '</span></td>';
      html += '<td><span class="shift-badge shift-' + emp.shift + '">' + icon('clock', 11) + ' ' + shiftConf.label + ' (' + shiftConf.start + '-' + shiftConf.end + ')</span></td>';
      html += '<td><span class="badge badge-success"><span class="badge-dot"></span>' + emp.status + '</span></td>';
      var docsHtml = emp.documents_complete ? '<span class="badge badge-info" style="cursor:pointer" data-doc-complete="' + emp.id + '" title="View Documents">' + icon('checkCheck', 12) + ' Complete</span>' : '<button class="btn btn-xs btn-warning" data-doc-complete="' + emp.id + '" title="Manage Documents">?? Missing</button>';
      html += '<td>' + docsHtml + '</td>';
      html += '<td><div style="display:flex;gap:4px"><button class="btn btn-ghost btn-icon" data-view="' + emp.id + '" title="View">' + icon('eye') + '</button><button class="btn btn-ghost btn-icon" data-edit="' + emp.id + '" title="Edit">' + icon('edit') + '</button><button class="btn btn-ghost btn-icon" data-del="' + emp.id + '" title="Delete" style="color:var(--accent-danger)">' + icon('trash') + '</button></div></td></tr>';
    });
    if (filtered.length === 0) html += '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">No employees found</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    // Restore focus to search input after re-render
    var searchEl = document.getElementById('emp-search');
    if (searchEl && search) {
      searchEl.focus();
      searchEl.setSelectionRange(search.length, search.length);
    }

    // Events
    document.getElementById('emp-search').addEventListener('input', function() { search = this.value; render(); });
    document.getElementById('emp-dept-filter').addEventListener('change', function() { deptFilter = this.value; render(); });
    document.getElementById('add-emp-btn').addEventListener('click', function() { showEmpModal(); });
    document.querySelectorAll('[data-view]').forEach(function(btn) { btn.addEventListener('click', function() { showEmpView(this.getAttribute('data-view')); }); });
    document.querySelectorAll('[data-edit]').forEach(function(btn) { btn.addEventListener('click', function() { showEmpModal(this.getAttribute('data-edit')); }); });
    document.querySelectorAll('[data-del]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-del');
        if (confirm('Are you sure you want to remove this employee?')) {
          sbClient.from('users').delete().eq('id', id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
          employees = employees.filter(function(e) { return e.id !== id; });
          render();
        }
      });
    });

    // Document Checklist
    document.querySelectorAll('[data-doc-complete]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-doc-complete');
        var emp = employees.find(function(e) { return e.id === id; });
        var savedState = {};
        try { savedState = JSON.parse(localStorage.getItem('doc_state_' + id)) || {}; } catch(e){}

        var body = '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">';
        body += '<div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);margin-bottom:8px"><h4 style="margin:0 0 4px 0;font-size:0.95rem;font-weight:700">الاوراق المطلوبه</h4><p style="margin:0;font-size:0.8rem;color:var(--text-muted)">Check the boxes as the documents are physically submitted.</p></div>';
        
        DOC_LIST.forEach(function(doc, idx) {
          var isChecked = (emp.documents_complete || savedState[idx]) ? 'checked' : '';
          body += '<label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.2s" class="doc-chk-lbl"><input type="checkbox" class="doc-chk" data-idx="'+idx+'" '+isChecked+' style="width:20px;height:20px;accent-color:var(--accent-primary);flex-shrink:0"> <span style="font-weight:600;font-size:0.9rem">'+doc+'</span></label>';
        });
        body += '</div>';

        var footer = '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="save-docs-btn">Save Status</button>';
        App.showModal('Required Documents - ' + emp.full_name, body, footer, true);

        // Highlight selected items
        document.querySelectorAll('.doc-chk').forEach(function(chk) {
          var updateStyle = function() {
             var lbl = chk.parentElement;
             if(chk.checked) { lbl.style.background = 'rgba(99, 102, 241, 0.08)'; lbl.style.borderColor = 'var(--accent-primary)'; }
             else { lbl.style.background = 'transparent'; lbl.style.borderColor = 'var(--border-color)'; }
          };
          chk.addEventListener('change', updateStyle);
          updateStyle();
        });

        document.getElementById('save-docs-btn').addEventListener('click', function() {
          var newState = {};
          var allChecked = true;
          document.querySelectorAll('.doc-chk').forEach(function(chk) {
            newState[chk.getAttribute('data-idx')] = chk.checked;
            if(!chk.checked) allChecked = false;
          });
          localStorage.setItem('doc_state_' + id, JSON.stringify(newState));

          if (allChecked !== emp.documents_complete) {
            sbClient.from('users').update({ documents_complete: allChecked }).eq('id', id).then(function(r) {
              if(r && r.error) { alert('Error updating database: ' + r.error.message); return; }
              emp.documents_complete = allChecked;
              render();
              if (allChecked) showToast('All documents submitted!', 'success');
              else showToast('Document status updated', 'info');
              App.closeModal();
            });
          } else {
            // Unchanged complete status, just close
            App.closeModal();
            showToast('Document checklist saved internally', 'info');
          }
        });
      });
    });
  }

  function showEmpView(id) {
    var emp = employees.find(function(e) { return e.id === id; });
    if (!emp) return;
    var ins = calculateInsuranceDuration(emp.insurance_start);
    var empShiftSystem = emp.shift_system || '3-shift';
    var shiftConf = getShiftConfig(emp.shift, empShiftSystem);
    var hasInsurance = emp.insurance_start && emp.insurance_active;
    var body = '<div class="profile-header" style="margin-bottom:20px"><div class="profile-avatar" style="background:' + (emp.avatar_color||'#6366f1') + '">' + getInitials(emp.full_name) + '</div><div class="profile-info"><h2>' + emp.full_name + '</h2><div class="profile-meta"><span>🆔 ' + emp.employee_id + '</span><span>🏢 ' + emp.department + '</span><span>💼 ' + (emp.position||'—') + '</span></div></div></div>';
    body += '<div class="form-row"><div class="form-field"><label>Email</label><input value="' + (emp.email || 'No email') + '" readonly class="form-input" style="padding:10px 14px"></div><div class="form-field"><label>Phone</label><input value="' + (emp.phone||'—') + '" readonly class="form-input" style="padding:10px 14px"></div></div>';
    var isDailyView = emp.position && emp.position.indexOf('(عامل يومية)') !== -1;
    var displayedSalary = isDailyView ? Math.round((emp.base_salary||0) / 30) : (emp.base_salary||0);
    body += '<div class="form-row"><div class="form-field"><label>Hire Date</label><input value="' + formatDate(emp.hire_date) + '" readonly class="form-input" style="padding:10px 14px"></div><div class="form-field"><label>' + (isDailyView ? 'Daily Wage' : 'Base Salary') + '</label><input value="EGP ' + displayedSalary.toLocaleString() + (isDailyView ? ' / day' : '') + '" readonly class="form-input" style="padding:10px 14px"></div></div>';
    body += '<div class="form-row"><div class="form-field"><label>Shift System</label><input value="' + (empShiftSystem === '2-shift' ? '2-Shift (12h)' : '3-Shift (8h)') + '" readonly class="form-input" style="padding:10px 14px"></div><div class="form-field"><label>Shift</label><input value="' + shiftConf.label + ' (' + shiftConf.start + ' - ' + shiftConf.end + ')" readonly class="form-input" style="padding:10px 14px"></div></div>';
    if (hasInsurance) {
      body += '<div class="insurance-card" style="margin-top:16px"><div style="display:flex;align-items:center;gap:8px">' + icon('shield') + '<span style="font-weight:600">Insurance: Active since ' + formatDate(emp.insurance_start) + '</span></div><div class="insurance-grid" style="margin-top:12px"><div class="insurance-stat"><div class="value">' + ins.years + '</div><div class="label">Years</div></div><div class="insurance-stat"><div class="value">' + ins.months + '</div><div class="label">Months</div></div><div class="insurance-stat"><div class="value">' + ins.days + '</div><div class="label">Days</div></div><div class="insurance-stat"><div class="value">' + ins.totalDays + '</div><div class="label">Total Days</div></div></div></div>';
    } else {
      body += '<div style="margin-top:16px;padding:16px;background:rgba(239,68,68,0.08);border-radius:var(--radius-md);border:1px solid rgba(239,68,68,0.2);display:flex;align-items:center;gap:10px"><span style="font-size:1.2rem">🚫</span><span style="font-weight:600;color:var(--accent-danger)">No Insurance — Salary divided by 30 days</span></div>';
    }
    App.showModal('Employee Profile', body, '', true);
  }

  function showEmpModal(editId) {
    var emp = editId ? employees.find(function(e) { return e.id === editId; }) : null;
    var currentSystem = emp ? (emp.shift_system || '3-shift') : '3-shift';
    var currentShift = emp ? (emp.shift || 'morning') : 'morning';

    var body = '<div class="form-row"><div class="form-field"><label>Full Name *</label><input id="ef-name" value="' + (emp ? emp.full_name : '') + '" placeholder="e.g. Ahmed Hassan"></div><div class="form-field"><label>Email <span style="color:var(--text-muted);font-size:0.75rem">(optional)</span></label><input type="email" id="ef-email" value="' + (emp ? (emp.email||'') : '') + '" placeholder="e.g. ahmed@factory.com"></div></div>';
    body += '<div class="form-row"><div class="form-field"><label>Username *</label><input id="ef-username" value="' + (emp ? emp.username : '') + '" placeholder="Login username"></div>';
    if (!emp) { body += '<div class="form-field"><label>Password *</label><input type="password" id="ef-password" placeholder="Login password"></div>'; }
    else { body += '<div class="form-field"><label>Phone</label><input id="ef-phone" value="' + (emp ? (emp.phone||'') : '') + '" placeholder="+20 1xx xxx xxxx"></div>'; }
    body += '</div>';
    if (!emp) { body += '<div class="form-row"><div class="form-field"><label>Phone</label><input id="ef-phone" value="" placeholder="+20 1xx xxx xxxx"></div><div></div></div>'; }
    var isDaily = emp && emp.position && emp.position.indexOf('(عامل يومية)') !== -1;
    var baseVal = emp ? (isDaily ? Math.round(emp.base_salary / 30) : emp.base_salary) : '';
    var myLevel = App.getRoleLevel(App.user ? App.user.role : 'hr');
    var roleOptions = '';
    if (myLevel >= 6) roleOptions += '<option value="hr manager" '+(emp && emp.role==='hr manager'?'selected':'')+'>HR Manager</option>';
    if (myLevel >= 5) roleOptions += '<option value="hr" '+(emp && emp.role==='hr'?'selected':'')+'>HR</option>';
    if (myLevel >= 4) roleOptions += '<option value="hall manager" '+(emp && emp.role==='hall manager'?'selected':'')+'>Hall Manager (مدير صالة)</option>';
    if (myLevel >= 3) roleOptions += '<option value="department head" '+(emp && emp.role==='department head'?'selected':'')+'>Department Head (رئيس قسم)</option>';
    if (myLevel >= 2) roleOptions += '<option value="employee" '+(!emp || emp.role==='employee'?'selected':'')+'>Employee (موظف)</option>';

    body += '<div class="form-row"><div class="form-field"><label>System Role *</label><select id="ef-role">'+roleOptions+'</select></div><div class="form-field"><label>Department *</label><select id="ef-dept">';
    DEPARTMENTS.forEach(function(d) { body += '<option value="' + d + '"' + (emp && emp.department === d ? ' selected' : '') + '>' + d + '</option>'; });
    body += '</select></div></div><div class="form-row"><div class="form-field"><label>Position</label><input id="ef-pos" value="' + (emp ? (emp.position||'').replace(' (عامل يومية)', '') : '') + '" placeholder="Job title"></div><div></div></div>';
    
    var canEditSalary = true;
    if (App.user && App.user.role === 'hr') {
      var perms = App.user.permissions || {};
      if (!perms.can_edit_salary) canEditSalary = false;
    }
    body += '<div style="margin-bottom:12px"><label style="display:inline-flex;align-items:center;gap:8px;font-weight:600;cursor:pointer"><input type="checkbox" id="ef-is-daily" ' + (isDaily ? 'checked' : '') + ' '+(canEditSalary?'':'disabled')+'> عامل يومية (Daily Worker - Paid per attended day)</label></div>';
    body += '<div class="form-row"><div class="form-field"><label id="ef-salary-label">' + (isDaily ? 'Daily Wage (EGP) *' : 'Monthly Base Salary (EGP)') + '</label><input type="number" id="ef-salary" value="' + baseVal + '" placeholder="0" '+(canEditSalary?'':'disabled title="Restricted"')+'>' + (!canEditSalary?'<div style="font-size:0.7rem;color:var(--accent-danger);margin-top:4px">Access Restricted</div>':'') + '</div><div class="form-field"><label>Shift System *</label><select id="ef-shift-system">';
    body += '<option value="2-shift"' + (currentSystem === '2-shift' ? ' selected' : '') + '>2-Shift (12h each)</option>';
    body += '<option value="3-shift"' + (currentSystem === '3-shift' ? ' selected' : '') + '>3-Shift (8h each)</option>';
    body += '</select></div></div>';
    body += '<div class="form-row"><div class="form-field"><label>Shift *</label><select id="ef-shift">';
    var availableShifts = getShiftsForSystem(currentSystem);
    availableShifts.forEach(function(s) { body += '<option value="' + s.key + '"' + (currentShift === s.key ? ' selected' : '') + '>' + s.label + '</option>'; });
    body += '</select></div><div class="form-field"><label>Hire Date</label><input type="date" id="ef-hire" value="' + (emp ? (emp.hire_date||'') : '') + '"></div></div>';
    body += '<div class="form-row"><div class="form-field"><label>Insurance Start Date <span style="color:var(--text-muted);font-size:0.75rem">(leave blank = no insurance)</span></label><input type="date" id="ef-ins" value="' + (emp ? (emp.insurance_start||'') : '') + '"></div><div></div></div>';

    if (myLevel >= 5) {
      var p = emp ? (emp.permissions || {}) : {};
      body += '<div id="hr-permissions-section" style="display:'+(emp && emp.role==='hr'?'block':'none')+';margin-top:16px;margin-bottom:16px;padding:16px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:rgba(99,102,241,0.04)">';
      body += '<h4 style="margin:0 0 12px 0;font-size:0.9rem;font-weight:700;color:var(--accent-primary)">HR Custom Permissions</h4>';
      body += '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;margin-bottom:8px;cursor:pointer"><input type="checkbox" id="ef-perm-edit-salary" ' + (p.can_edit_salary ? 'checked' : '') + '> Allow Editing Base Salaries</label>';
      body += '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;cursor:pointer"><input type="checkbox" id="ef-perm-adjust-salary" ' + (p.can_adjust_salary ? 'checked' : '') + '> Allow Issuing Bonuses & Deductions</label>';
      body += '</div>';
    }

    var footer = '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="emp-save-btn">' + (emp ? 'Save Changes' : 'Add Employee') + '</button>';
    App.showModal(emp ? 'Edit Employee' : 'Add New Employee', body, footer, true);

    if (document.getElementById('ef-is-daily')) {
      document.getElementById('ef-is-daily').addEventListener('change', function() {
        document.getElementById('ef-salary-label').textContent = this.checked ? 'Daily Wage (EGP) *' : 'Monthly Base Salary (EGP)';
      });
    }

    if (myLevel >= 5 && document.getElementById('ef-role')) {
      var updatePermSection = function() {
        var sec = document.getElementById('hr-permissions-section');
        if (!sec) return;
        sec.style.display = document.getElementById('ef-role').value === 'hr' ? 'block' : 'none';
      };
      document.getElementById('ef-role').addEventListener('change', updatePermSection);
    }

    // Dynamic: when shift system changes, update shift dropdown
    document.getElementById('ef-shift-system').addEventListener('change', function() {
      var sys = this.value;
      var shiftSelect = document.getElementById('ef-shift');
      var shifts = getShiftsForSystem(sys);
      shiftSelect.innerHTML = '';
      shifts.forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s.key;
        opt.textContent = s.label;
        shiftSelect.appendChild(opt);
      });
    });

    document.getElementById('emp-save-btn').addEventListener('click', function() {
      var insVal = document.getElementById('ef-ins').value;
      var hasInsurance = !!insVal;
      var dailyChecked = document.getElementById('ef-is-daily') && document.getElementById('ef-is-daily').checked;
      var rawSalary = Number(document.getElementById('ef-salary').value);
      var form = {
        full_name: document.getElementById('ef-name').value,
        email: document.getElementById('ef-email').value || null,
        username: document.getElementById('ef-username').value,
        role: document.getElementById('ef-role') ? document.getElementById('ef-role').value : 'employee',
        department: document.getElementById('ef-dept').value,
        position: document.getElementById('ef-pos').value + (dailyChecked ? ' (عامل يومية)' : ''),
        phone: document.getElementById('ef-phone').value,
        base_salary: dailyChecked ? (rawSalary * 30) : rawSalary,
        shift_system: document.getElementById('ef-shift-system').value,
        shift: document.getElementById('ef-shift').value,
        hire_date: document.getElementById('ef-hire').value,
        insurance_start: insVal || null,
        insurance_active: dailyChecked ? false : hasInsurance,
        documents_complete: (emp ? emp.documents_complete : false)
      };

      var canEditSalary = true;
      if (App.user && App.user.role === 'hr') {
        var perms = App.user.permissions || {};
        if (!perms.can_edit_salary) canEditSalary = false;
      }
      if (!canEditSalary && emp) {
        form.base_salary = emp.base_salary;
        form.position = emp.position; 
      }

      var ml = App.getRoleLevel(App.user.role);
      if (form.role === 'hr' && ml >= 5) {
        form.permissions = {
          can_edit_salary: document.getElementById('ef-perm-edit-salary') ? document.getElementById('ef-perm-edit-salary').checked : false,
          can_adjust_salary: document.getElementById('ef-perm-adjust-salary') ? document.getElementById('ef-perm-adjust-salary').checked : false
        };
      }

      if (!form.full_name) { alert('Full name is required'); return; }
      if (emp) {
        Object.assign(emp, form);
        sbClient.from('users').update(form).eq('id', emp.id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
      } else {
        var passInputValue = document.getElementById('ef-password') ? document.getElementById('ef-password').value : 'emp123';
        if (!form.username) { alert('Username is required'); return; }
        if (!passInputValue) { alert('Password is required'); return; }
        var newEmp = Object.assign({ employee_id: 'EMP-' + String(employees.length + 1).padStart(3, '0'), status: 'active', avatar_color: 'hsl(' + Math.floor(Math.random() * 360) + ',60%,50%)', password_hash: passInputValue }, form);
        sbClient.from('users').insert([newEmp]).select().single().then(function(r) {
          if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); return; }
          if (r.data) { employees.push(r.data); render(); }
        });
      }
      App.closeModal();
      render();
      showToast(emp ? 'Employee updated!' : 'Employee added!', 'success');
    });
  }

  {
    var myLevel = App.getRoleLevel(App.user ? App.user.role : 'hr');
    var allowedRoles = [];
    if (myLevel >= 6) allowedRoles.push('hr manager', 'hr', 'hall manager', 'department head', 'employee');
    if (myLevel >= 5) allowedRoles.push('hr', 'hall manager', 'department head', 'employee');
    if (myLevel >= 4) allowedRoles.push('hall manager', 'department head', 'employee');
    if (myLevel >= 3) allowedRoles.push('department head', 'employee');
    if (myLevel >= 2) allowedRoles.push('employee');
    allowedRoles = allowedRoles.filter(function(item, pos) { return allowedRoles.indexOf(item) === pos; });

    sbClient.from('users').select('*').in('role', allowedRoles).order('created_at', { ascending: false }).then(function(res) {
      if (res.data) { employees = res.data; render(); }
    });
  }
  render();
};

// ----- ATTENDANCE -----
Pages.attendance = function(el) {
  var isHR = App.isHR();
  var records = isHR ? [] : [].filter(function(a) { return a.employee_id === App.user.id; });
  var search = '';
  var deptFilter = '';
  var dateFilter = '';
  var statusFilter = '';

  function render(data) {
    var html = '<div class="toolbar">';
    if (isHR) html += '<div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search by name..." id="att-search" value="' + (search || '').replace(/"/g, '&quot;') + '"></div>';
    if (isHR) { html += '<select class="filter-select" id="att-dept"><option value="">All Departments</option>'; DEPARTMENTS.forEach(function(d) { html += '<option value="' + d + '"' + (deptFilter === d ? ' selected' : '') + '>' + d + '</option>'; }); html += '</select>'; }
    html += '<input type="date" class="filter-select" id="att-date" value="' + dateFilter + '"><select class="filter-select" id="att-status"><option value=""' + (statusFilter===''?' selected':'') + '>All Status</option><option value="present"' + (statusFilter==='present'?' selected':'') + '>Present</option><option value="checked_in"' + (statusFilter==='checked_in'?' selected':'') + '>Checked In</option><option value="absent"' + (statusFilter==='absent'?' selected':'') + '>Absent</option></select>';
    html += '<button class="btn btn-outline" id="att-export">' + icon('download') + ' Export</button></div>';

    html += '<div class="card"><div class="card-header"><div><h3>' + (isHR ? 'Attendance Records' : 'My Attendance History') + '</h3><p>' + data.length + ' records</p></div></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr>';
    if (isHR) html += '<th>Employee</th><th>Department</th>';
    html += '<th>Date</th><th>Check In</th><th>Check Out</th><th>Shift</th><th>Working Hours</th><th>Delay</th><th>Status</th></tr></thead><tbody>';
    data.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function(r) {
      html += '<tr>';
      if (isHR) html += '<td style="color:var(--text-primary);font-weight:500">' + r.employee_name + '</td><td>' + r.department + '</td>';
      html += '<td>' + formatDate(r.date) + '</td><td>' + formatTime(r.check_in) + '</td><td>' + formatTime(r.check_out) + '</td>';
      html += '<td><span class="shift-badge shift-' + r.shift + '">' + icon('clock', 11) + ' ' + r.shift + '</span></td>';
      html += '<td>' + (r.working_hours ? r.working_hours + 'h' : '—') + '</td>';
      html += '<td>' + (r.delay_minutes > 0 ? '<span style="color:var(--accent-warning);font-weight:600">' + icon('alertTriangle') + ' ' + r.delay_minutes + ' min</span>' : '<span style="color:var(--accent-success)">On time</span>') + '</td>';
      var badge = r.status === 'present' ? 'badge-success' : r.status === 'checked_in' ? 'badge-info' : 'badge-danger';
      html += '<td><span class="badge ' + badge + '"><span class="badge-dot"></span>' + r.status.replace('_', ' ') + '</span></td></tr>';
    });
    if (data.length === 0) html += '<tr><td colspan="' + (isHR ? 9 : 7) + '" style="text-align:center;padding:40px;color:var(--text-muted)">No attendance records found</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    // Restore focus to search input after re-render
    var searchEl = document.getElementById('att-search');
    if (searchEl && search) {
      searchEl.focus();
      searchEl.setSelectionRange(search.length, search.length);
    }

    // Filters
    function applyFilters() {
      search = document.getElementById('att-search') ? document.getElementById('att-search').value.toLowerCase() : '';
      deptFilter = document.getElementById('att-dept') ? document.getElementById('att-dept').value : '';
      dateFilter = document.getElementById('att-date').value;
      statusFilter = document.getElementById('att-status').value;
      var f = records.filter(function(r) {
        if (search && r.employee_name && r.employee_name.toLowerCase().indexOf(search) === -1) return false;
        if (deptFilter && r.department !== deptFilter) return false;
        if (dateFilter && r.date !== dateFilter) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        return true;
      });
      render(f);
    }
    if (document.getElementById('att-search')) document.getElementById('att-search').addEventListener('input', applyFilters);
    if (document.getElementById('att-dept')) document.getElementById('att-dept').addEventListener('change', applyFilters);
    document.getElementById('att-date').addEventListener('change', applyFilters);
    document.getElementById('att-status').addEventListener('change', applyFilters);
    document.getElementById('att-export').addEventListener('click', function() { exportToCSV(data, 'attendance_report'); });
  }

  {
    var query = sbClient.from('attendance').select('*').order('date', { ascending: false });
    if (!isHR) query = query.eq('employee_id', App.user.id);
    query.then(function(res) { if (res.data) { records = res.data; render(records); } });
  }
  render(records);
};

// ----- QR CHECKIN -----
Pages.qrCheckin = function(el) {
  var user = App.user;
  var empShiftSystem = user.shift_system || '3-shift';
  var shift = getShiftConfig(user.shift, empShiftSystem);
  var checkedIn = false, checkedOut = false, checkInTime = null, checkOutTime = null, currentRecordId = null, delayMin = 0;

  function renderQR() {
    var now = new Date();
    var html = '<div style="max-width:600px;margin:0 auto">';
    html += '<div class="card" style="margin-bottom:20px;text-align:center"><div class="card-body"><div style="font-size:2.5rem;font-weight:800;font-feature-settings:\'tnum\';color:var(--text-primary)" id="live-clock">' + now.toLocaleTimeString('en-US', { hour12: true }) + '</div><div style="font-size:0.9rem;color:var(--text-tertiary);margin-top:4px">' + formatDate(now) + ' — ' + (shift ? shift.label + ' (' + shift.start + ' - ' + shift.end + ')' : '') + '</div></div></div>';
    html += '<div class="card"><div class="card-header" style="justify-content:center"><h3>' + (checkedOut ? '✅ Shift Complete' : checkedIn ? 'Ready to Check Out' : 'Ready to Check In') + '</h3></div>';
    html += '<div class="qr-section"><div class="qr-code-wrapper" id="qr-container"></div>';
    html += '<div class="qr-status"><p style="color:var(--text-secondary);font-size:0.85rem">' + user.full_name + ' — ' + user.employee_id + '</p></div>';
    if (!checkedOut) {
      html += '<button class="btn ' + (checkedIn ? 'btn-warning' : 'btn-primary') + '" style="width:100%;padding:14px;font-size:1rem" id="qr-scan-btn">' + (checkedIn ? icon('logOut') + ' Check Out' : icon('logIn') + ' Check In') + '</button>';
    }
    html += '</div></div>';
    if (checkedIn || checkedOut) {
      html += '<div class="card" style="margin-top:20px"><div class="card-body"><div style="display:flex;flex-direction:column;gap:14px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text-tertiary);display:flex;align-items:center;gap:6px">' + icon('logIn', 15) + ' Check In Time</span><span style="font-weight:700;color:var(--accent-success)">' + formatTime(checkInTime) + '</span></div>';
      if (checkedOut) html += '<div style="display:flex;justify-content:space-between;align-items:center"><span style="color:var(--text-tertiary);display:flex;align-items:center;gap:6px">' + icon('logOut', 15) + ' Check Out Time</span><span style="font-weight:700;color:var(--accent-warning)">' + formatTime(checkOutTime) + '</span></div>';
      var workHrs = checkInTime ? (((checkOutTime || new Date()) - checkInTime) / 3600000).toFixed(2) : '0.00';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-color);padding-top:14px"><span style="color:var(--text-tertiary);display:flex;align-items:center;gap:6px">' + icon('clock', 15) + ' Working Hours</span><span style="font-weight:700;font-size:1.1rem;color:var(--accent-primary-hover)">' + workHrs + 'h</span></div>';
      if (delayMin > 0) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(245,158,11,0.1);padding:12px;border-radius:var(--radius-md);margin-top:4px"><span style="color:var(--accent-warning);display:flex;align-items:center;gap:6px;font-weight:600">' + icon('alertTriangle', 15) + ' Late by</span><span style="font-weight:700;font-size:1.1rem;color:var(--accent-warning)">' + delayMin + ' min</span></div>';
      } else if (checkedIn) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(34,197,94,0.1);padding:12px;border-radius:var(--radius-md);margin-top:4px"><span style="color:var(--accent-success);display:flex;align-items:center;gap:6px;font-weight:600">' + icon('checkCircle', 15) + ' Status</span><span style="font-weight:700;color:var(--accent-success)">On Time \u2705</span></div>';
      }
      html += '</div></div></div>';
    }
    html += '</div>';
    el.innerHTML = html;

    // QR code
    setTimeout(function() {
      var qrData = JSON.stringify({ employee_id: user.employee_id, name: user.full_name, department: user.department, timestamp: new Date().toISOString(), type: checkedIn ? 'checkout' : 'checkin' });
      var container = document.getElementById('qr-container');
      if (container && typeof QRCode !== 'undefined') {
        new QRCode(container, { text: qrData, width: 200, height: 200, colorDark: checkedOut ? '#22c55e' : '#0a0e1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
      }
    }, 50);

    // Live clock
    var clockEl = document.getElementById('live-clock');
    if (clockEl) {
      setInterval(function() { if (document.getElementById('live-clock')) document.getElementById('live-clock').textContent = new Date().toLocaleTimeString('en-US', { hour12: true }); }, 1000);
    }

    // Scan button
    var scanBtn = document.getElementById('qr-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', function() {
        scanBtn.disabled = true;
        scanBtn.innerHTML = '<span class="spinner"></span>';
        setTimeout(function() {
          var timeNow = new Date();
          if (!checkedIn) {
            checkedIn = true;
            checkInTime = timeNow;
            // Calculate delay: compare check-in time to shift start
            delayMin = 0;
            if (shift && shift.start) {
              var parts = shift.start.split(':');
              var shiftStart = new Date(timeNow);
              shiftStart.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
              // Handle night shift crossing midnight
              if (empShiftSystem === '2-shift' && user.shift === 'night') {
                // Night shift starts at 18:00 - if current time is after midnight, shift started yesterday
                if (timeNow.getHours() < 12) {
                  shiftStart.setDate(shiftStart.getDate() - 1);
                }
              } else if (user.shift === 'night') {
                // 3-shift night starts at 22:00 - if current time is after midnight, shift started yesterday
                if (timeNow.getHours() < 12) {
                  shiftStart.setDate(shiftStart.getDate() - 1);
                }
              }
              var diffMs = timeNow - shiftStart;
              if (diffMs > 0) {
                delayMin = Math.floor(diffMs / 60000);
              }
            }
            {
              sbClient.from('attendance').insert({ employee_id: user.id, employee_name: user.full_name, department: user.department, date: todayStr(), check_in: timeNow.toISOString(), shift: user.shift, delay_minutes: delayMin, status: 'present' }).select().single().then(function(r) { if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); }
        if (r.data) currentRecordId = r.data.id; });
            }
            if (delayMin > 0) {
              showToast('⚠️ Checked in! You are ' + delayMin + ' minutes late.', 'warning');
            } else {
              showToast('✅ Successfully checked in! On time!', 'success');
            }
          } else {
            checkedOut = true;
            checkOutTime = timeNow;
            var diff = ((timeNow - checkInTime) / 3600000).toFixed(2);
            if (currentRecordId) {
              sbClient.from('attendance').update({ check_out: timeNow.toISOString(), working_hours: Number(diff) }).eq('id', currentRecordId).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
            }
            showToast('✅ Successfully checked out! Working hours: ' + diff + 'h', 'success');
          }
          renderQR();
        }, 1500);
      });
    }
  }

  {
    sbClient.from('attendance').select('*').eq('employee_id', user.id).eq('date', todayStr()).order('created_at', { ascending: false }).limit(1).single().then(function(res) {
      if (res.data) {
        currentRecordId = res.data.id;
        if (res.data.check_in) { checkedIn = true; checkInTime = new Date(res.data.check_in); }
        if (res.data.check_out) { checkedOut = true; checkOutTime = new Date(res.data.check_out); }
      }
      renderQR();
    });
  }
};

// ----- LEAVES -----
Pages.leaves = function(el) {
  var isHR = App.isHR();
  var leaves = isHR ? [] : [].filter(function(l) { return l.employee_id === App.user.id; });

  var search = '';
  var statusFilter = '';
  var deptFilter = '';

  function render(data) {
    var html = '<div class="toolbar">';
    if (isHR) html += '<div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search employee..." id="lv-search" value="' + (search||'').replace(/"/g, '&quot;') + '"></div>';
    html += '<select class="filter-select" id="lv-status"><option value=""' + (statusFilter===''?' selected':'') + '>All Status</option><option value="pending"' + (statusFilter==='pending'?' selected':'') + '>Pending</option><option value="approved"' + (statusFilter==='approved'?' selected':'') + '>Approved</option><option value="rejected"' + (statusFilter==='rejected'?' selected':'') + '>Rejected</option></select>';
    if (isHR) { html += '<select class="filter-select" id="lv-dept"><option value="">All Departments</option>'; DEPARTMENTS.forEach(function(d) { html += '<option value="' + d + '"' + (deptFilter===d?' selected':'') + '>' + d + '</option>'; }); html += '</select>'; }
    if (!isHR) html += '<button class="btn btn-primary" id="req-leave-btn">' + icon('plus') + ' Request Leave</button>';
    if (isHR) html += '<button class="btn btn-outline" id="lv-export">' + icon('download') + ' Export</button>';
    html += '</div>';

    html += '<div class="card"><div class="card-header"><div><h3>' + (isHR ? 'All Leave Requests' : 'My Leave Requests') + '</h3><p>' + data.length + ' requests</p></div></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr>';
    if (isHR) html += '<th>Employee</th><th>Department</th>';
    html += '<th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>';
    if (isHR) html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    data.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); }).forEach(function(l) {
      html += '<tr>';
      if (isHR) html += '<td style="color:var(--text-primary);font-weight:500">' + l.employee_name + '</td><td>' + l.department + '</td>';
      html += '<td><span class="badge badge-info">' + l.type + '</span></td><td>' + formatDate(l.start_date) + '</td><td>' + formatDate(l.end_date) + '</td><td style="font-weight:600">' + l.days + '</td>';
      html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + l.reason + '</td>';
      var badge = l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-danger' : 'badge-warning';
      html += '<td><span class="badge ' + badge + '"><span class="badge-dot"></span>' + l.status.charAt(0).toUpperCase() + l.status.slice(1) + '</span></td>';
      if (isHR) {
        html += '<td>';
        if (l.status === 'pending') {
          html += '<div style="display:flex;gap:4px"><button class="btn btn-success btn-xs" data-approve="' + l.id + '">' + icon('checkCircle') + ' Approve</button><button class="btn btn-danger btn-xs" data-reject="' + l.id + '">' + icon('xCircle') + ' Reject</button></div>';
        } else {
          html += '<span style="font-size:0.75rem;color:var(--text-muted)">By ' + l.approved_by + '</span>';
        }
        html += '</td>';
      }
      html += '</tr>';
    });
    if (data.length === 0) html += '<tr><td colspan="' + (isHR ? 9 : 7) + '" style="text-align:center;padding:40px;color:var(--text-muted)">No leave requests found</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    var searchEl = document.getElementById('lv-search');
    if (searchEl && search) {
      searchEl.focus();
      searchEl.setSelectionRange(search.length, search.length);
    }

    // Events
    function applyFilters() {
      search = document.getElementById('lv-search') ? document.getElementById('lv-search').value.toLowerCase() : '';
      statusFilter = document.getElementById('lv-status').value;
      deptFilter = document.getElementById('lv-dept') ? document.getElementById('lv-dept').value : '';
      var f = leaves.filter(function(l) {
        if (search && l.employee_name && l.employee_name.toLowerCase().indexOf(search) === -1) return false;
        if (statusFilter && l.status !== statusFilter) return false;
        if (deptFilter && l.department !== deptFilter) return false;
        return true;
      });
      render(f);
    }
    if (document.getElementById('lv-search')) document.getElementById('lv-search').addEventListener('input', applyFilters);
    document.getElementById('lv-status').addEventListener('change', applyFilters);
    if (document.getElementById('lv-dept')) document.getElementById('lv-dept').addEventListener('change', applyFilters);
    if (document.getElementById('lv-export')) document.getElementById('lv-export').addEventListener('click', function() { exportToCSV(data, 'leave_report'); });

    // Request leave
    var reqBtn = document.getElementById('req-leave-btn');
    if (reqBtn) reqBtn.addEventListener('click', function() {
      var body = '<div class="form-row"><div class="form-field"><label>Leave Type</label><select id="lf-type">';
      LEAVE_TYPES.forEach(function(t) { body += '<option value="' + t + '">' + t + '</option>'; });
      body += '</select></div></div><div class="form-row"><div class="form-field"><label>Start Date</label><input type="date" id="lf-start"></div><div class="form-field"><label>End Date</label><input type="date" id="lf-end"></div></div><div class="form-field" style="margin-bottom:0"><label>Reason</label><textarea id="lf-reason" placeholder="Explain the reason for your leave..."></textarea></div>';
      App.showModal('Request Leave', body, '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="submit-leave">Submit Request</button>');
      document.getElementById('submit-leave').addEventListener('click', function() {
        var type = document.getElementById('lf-type').value;
        var start = document.getElementById('lf-start').value;
        var end = document.getElementById('lf-end').value;
        var reason = document.getElementById('lf-reason').value;
        if (!start || !end || !reason) return;
        var days = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
        var newLeave = { employee_id: App.user.id, employee_name: App.user.full_name, department: App.user.department, type: type, start_date: start, end_date: end, days: days, reason: reason, status: 'pending', created_at: new Date().toISOString() };
        sbClient.from('leave_requests').insert([newLeave]).select().single().then(function(r) { if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); }
        if (r.data) leaves.unshift(r.data); render(leaves); });
        App.closeModal();
        render(leaves);
        showToast('Leave request submitted!', 'success');
      });
    });

    // Approve / Reject
    document.querySelectorAll('[data-approve]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-approve');
        handleLeaveAction(id, 'approved');
      });
    });
    document.querySelectorAll('[data-reject]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-reject');
        handleLeaveAction(id, 'rejected');
      });
    });
  }

  function handleLeaveAction(id, action) {
    {
      sbClient.from('leave_requests').update({ status: action, approved_by: App.user.full_name }).eq('id', id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
      sbClient.from('audit_log').insert({ action: action === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED', user_name: App.user.full_name, user_id: App.user.id, details: (action === 'approved' ? 'Approved' : 'Rejected') + ' leave request ID: ' + id }).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
    }
    leaves = leaves.map(function(l) {
      if (l.id === id) {
        App.addNotification({ user_id: l.employee_id, type: action === 'approved' ? 'leave_approved' : 'leave_rejected', title: 'Leave ' + (action === 'approved' ? 'Approved ✅' : 'Rejected ❌'), message: 'Your ' + l.type + ' leave (' + formatDate(l.start_date) + ' - ' + formatDate(l.end_date) + ') has been ' + action + '.' });
        EmailService.sendEmail({ userId: l.employee_id, toName: l.employee_name, subject: 'Leave Request ' + (action === 'approved' ? 'Approved' : 'Rejected'), htmlContent: '<h2>Leave Request Update</h2><p>Hello ' + l.employee_name + ',</p><p>Your ' + l.type + ' leave request for <strong>' + formatDate(l.start_date) + ' to ' + formatDate(l.end_date) + '</strong> has been <strong>' + action + '</strong> by HR.</p><p>Smart Factory HR</p>' });
        return Object.assign({}, l, { status: action, approved_by: App.user.full_name });
      }
      return l;
    });
    render(leaves);
    showToast('Leave ' + action + '!', action === 'approved' ? 'success' : 'error');
  }

  {
    var query = sbClient.from('leave_requests').select('*').order('created_at', { ascending: false });
    if (!isHR) query = query.eq('employee_id', App.user.id);
    query.then(function(res) { if (res.data) { leaves = res.data; render(leaves); } });
  }
  render(leaves);
};

// ----- SHIFTS -----
Pages.shifts = function(el) {
  var employees = [];
  function render() {
    var twoShiftCount = employees.filter(function(e) { return (e.shift_system || '3-shift') === '2-shift'; }).length;
    var threeShiftCount = employees.filter(function(e) { return (e.shift_system || '3-shift') === '3-shift'; }).length;
    var colors = { day: '#fbbf24', morning: '#fbbf24', evening: '#fb923c', night: '#818cf8' };
    var shiftIcons = { day: 'sun', morning: 'sun', evening: 'sunset', night: 'moon' };

    var html = '<div class="stats-grid" style="margin-bottom:24px">';
    html += _statCard('#6366f1', 'users', employees.length, 'Total Employees');
    html += _statCard('#22c55e', 'clock', twoShiftCount, '2-Shift System (12h)');
    html += _statCard('#06b6d4', 'clock', threeShiftCount, '3-Shift System (8h)');
    html += '</div>';
    html += '<div class="toolbar"><div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search employees..." id="sh-search"></div>';
    html += '<select class="filter-select" id="sh-dept"><option value="">All Departments</option>'; DEPARTMENTS.forEach(function(d) { html += '<option value="' + d + '">' + d + '</option>'; }); html += '</select>';
    html += '<select class="filter-select" id="sh-system"><option value="">All Systems</option><option value="2-shift">2-Shift (12h)</option><option value="3-shift">3-Shift (8h)</option></select></div>';

    html += '<div class="card"><div class="card-header"><div><h3>Shift Assignments</h3><p>' + employees.length + ' employees</p></div></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr><th>Employee</th><th>Department</th><th>Shift System</th><th>Current Shift</th><th>Hours</th><th>Change System</th><th>Change Shift</th></tr></thead><tbody>';
    employees.forEach(function(emp) {
      var sys = emp.shift_system || '3-shift';
      var conf = getShiftConfig(emp.shift, sys);
      html += '<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="sidebar-avatar" style="background:' + (emp.avatar_color||'#6366f1') + ';width:32px;height:32px;font-size:0.7rem">' + getInitials(emp.full_name) + '</div><span style="color:var(--text-primary);font-weight:500">' + emp.full_name + '</span></div></td><td>' + emp.department + '</td>';
      html += '<td><span class="badge badge-info" style="font-size:0.72rem">' + (sys === '2-shift' ? '2-Shift (12h)' : '3-Shift (8h)') + '</span></td>';
      html += '<td><span class="shift-badge shift-' + emp.shift + '">' + icon('clock', 11) + ' ' + conf.label + '</span></td>';
      html += '<td>' + conf.start + ' - ' + conf.end + ' (' + conf.hours + 'h)</td>';
      html += '<td><select class="filter-select" style="padding:6px 10px" data-system-emp="' + emp.id + '">';
      html += '<option value="2-shift"' + (sys === '2-shift' ? ' selected' : '') + '>2-Shift (12h)</option>';
      html += '<option value="3-shift"' + (sys === '3-shift' ? ' selected' : '') + '>3-Shift (8h)</option>';
      html += '</select></td>';
      html += '<td><select class="filter-select" style="padding:6px 10px" data-shift-emp="' + emp.id + '" data-emp-system="' + sys + '">';
      var availShifts = getShiftsForSystem(sys);
      availShifts.forEach(function(s) { html += '<option value="' + s.key + '"' + (emp.shift === s.key ? ' selected' : '') + '>' + s.label + '</option>'; });
      html += '</select></td></tr>';
    });
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    // Change shift system
    document.querySelectorAll('[data-system-emp]').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var empId = this.getAttribute('data-system-emp');
        var newSystem = this.value;
        var defaultShift = newSystem === '2-shift' ? 'day' : 'morning';
        employees = employees.map(function(e) { return e.id === empId ? Object.assign({}, e, { shift_system: newSystem, shift: defaultShift }) : e; });
        sbClient.from('users').update({ shift_system: newSystem, shift: defaultShift }).eq('id', empId).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
        showToast('Shift system updated!', 'success');
        render();
      });
    });

    // Change shift
    document.querySelectorAll('[data-shift-emp]').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var empId = this.getAttribute('data-shift-emp');
        var newShift = this.value;
        employees = employees.map(function(e) { return e.id === empId ? Object.assign({}, e, { shift: newShift }) : e; });
        sbClient.from('users').update({ shift: newShift }).eq('id', empId).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
        showToast('Shift updated!', 'success');
        render();
      });
    });
  }
  { 
    var myLevel = App.getRoleLevel(App.user ? App.user.role : 'hr');
    var allowedRoles = [];
    if (myLevel >= 6) allowedRoles.push('hr manager', 'hr', 'hall manager', 'department head', 'employee');
    if (myLevel >= 5) allowedRoles.push('hr', 'hall manager', 'department head', 'employee');
    if (myLevel >= 4) allowedRoles.push('hall manager', 'department head', 'employee');
    if (myLevel >= 3) allowedRoles.push('department head', 'employee');
    if (myLevel >= 2) allowedRoles.push('employee');
    allowedRoles = allowedRoles.filter(function(item, pos) { return allowedRoles.indexOf(item) === pos; });

    sbClient.from('users').select('*').in('role', allowedRoles).then(function(r) { if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); }
        if (r.data) { employees = r.data; render(); } }); 
  }
  render();
};

// ----- OVERTIME -----
Pages.overtime = function(el) {
  var isHR = App.isHR();
  var overtime = isHR ? [] : [].filter(function(o) { return o.employee_id === App.user.id; });

  var search = '';
  var statusFilter = '';

  function render(data) {
    var totalApproved = data.filter(function(o) { return o.status === 'approved'; }).reduce(function(s, o) { return s + o.hours; }, 0);
    var totalPending = data.filter(function(o) { return o.status === 'pending'; }).reduce(function(s, o) { return s + o.hours; }, 0);

    var html = '<div class="stats-grid" style="margin-bottom:24px">';
    html += _statCard('#22c55e', 'checkCircle', totalApproved + 'h', 'Approved Hours');
    html += _statCard('#f59e0b', 'timer', totalPending + 'h', 'Pending Approval');
    html += _statCard('#6366f1', 'timer', data.length, 'Total Records');
    html += '</div>';

    html += '<div class="toolbar">';
    if (isHR) html += '<div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search employee..." id="ot-search" value="' + (search||'').replace(/"/g, '&quot;') + '"></div>';
    html += '<select class="filter-select" id="ot-status"><option value=""' + (statusFilter===''?' selected':'') + '>All Status</option><option value="pending"' + (statusFilter==='pending'?' selected':'') + '>Pending</option><option value="approved"' + (statusFilter==='approved'?' selected':'') + '>Approved</option><option value="rejected"' + (statusFilter==='rejected'?' selected':'') + '>Rejected</option></select>';
    if (!isHR) html += '<button class="btn btn-primary" id="log-ot-btn">' + icon('plus') + ' Log Overtime</button>';
    html += '<button class="btn btn-outline" id="ot-export">' + icon('download') + ' Export</button></div>';

    html += '<div class="card"><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr>';
    if (isHR) html += '<th>Employee</th><th>Department</th>';
    html += '<th>Date</th><th>Hours</th><th>Rate</th><th>Reason</th><th>Status</th>';
    if (isHR) html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    data.sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function(o) {
      html += '<tr>';
      if (isHR) html += '<td style="color:var(--text-primary);font-weight:500">' + o.employee_name + '</td><td>' + o.department + '</td>';
      html += '<td>' + formatDate(o.date) + '</td><td style="font-weight:700">' + o.hours + 'h</td><td>' + o.rate + 'x</td>';
      html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + o.reason + '</td>';
      var badge = o.status === 'approved' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-danger';
      html += '<td><span class="badge ' + badge + '"><span class="badge-dot"></span>' + o.status.charAt(0).toUpperCase() + o.status.slice(1) + '</span></td>';
      if (isHR) {
        html += '<td>';
        if (o.status === 'pending') html += '<div style="display:flex;gap:4px"><button class="btn btn-success btn-xs" data-ot-approve="' + o.id + '">' + icon('checkCircle') + ' Approve</button><button class="btn btn-danger btn-xs" data-ot-reject="' + o.id + '">' + icon('xCircle') + ' Reject</button></div>';
        else html += '<span style="font-size:0.75rem;color:var(--text-muted)">By ' + o.approved_by + '</span>';
        html += '</td>';
      }
      html += '</tr>';
    });
    if (data.length === 0) html += '<tr><td colspan="' + (isHR ? 8 : 6) + '" style="text-align:center;padding:40px;color:var(--text-muted)">No overtime records</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    var searchEl = document.getElementById('ot-search');
    if (searchEl && search) {
      searchEl.focus();
      searchEl.setSelectionRange(search.length, search.length);
    }

    // Events
    function applyFilters() {
      search = document.getElementById('ot-search') ? document.getElementById('ot-search').value.toLowerCase() : '';
      statusFilter = document.getElementById('ot-status').value;
      render(overtime.filter(function(o) {
        if (search && o.employee_name && o.employee_name.toLowerCase().indexOf(search) === -1) return false;
        if (statusFilter && o.status !== statusFilter) return false;
        return true;
      }));
    }
    if (document.getElementById('ot-search')) document.getElementById('ot-search').addEventListener('input', applyFilters);
    document.getElementById('ot-status').addEventListener('change', applyFilters);
    document.getElementById('ot-export').addEventListener('click', function() { exportToCSV(data, 'overtime_report'); });

    if (document.getElementById('log-ot-btn')) document.getElementById('log-ot-btn').addEventListener('click', function() {
      var body = '<div class="form-row"><div class="form-field"><label>Date</label><input type="date" id="otf-date"></div><div class="form-field"><label>Hours</label><input type="number" step="0.5" min="0.5" max="8" id="otf-hours" placeholder="e.g. 2"></div></div><div class="form-field" style="margin-bottom:16px"><label>Rate Multiplier</label><select id="otf-rate"><option value="1.5">1.5x (Regular Overtime)</option><option value="2">2x (Holiday/Weekend)</option></select></div><div class="form-field"><label>Reason</label><textarea id="otf-reason" placeholder="Why did you work overtime?"></textarea></div>';
      App.showModal('Log Overtime Hours', body, '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="submit-ot">Submit for Approval</button>');
      document.getElementById('submit-ot').addEventListener('click', function() {
        var date = document.getElementById('otf-date').value;
        var hours = Number(document.getElementById('otf-hours').value);
        var reason = document.getElementById('otf-reason').value;
        var rate = Number(document.getElementById('otf-rate').value);
        if (!date || !hours || !reason) return;
        var newOT = { employee_id: App.user.id, employee_name: App.user.full_name, department: App.user.department, date: date, hours: hours, reason: reason, status: 'pending', rate: rate, approved_by: null };
        sbClient.from('overtime').insert([newOT]).select().single().then(function(r) {
          if (r.error) { alert('Error: ' + r.error.message); return; }
          if (r.data) {
            overtime.unshift(r.data);
            render(overtime);
          }
        });
        App.closeModal();
        showToast('Overtime submitted!', 'success');
      });
    });

    document.querySelectorAll('[data-ot-approve]').forEach(function(btn) { btn.addEventListener('click', function() { handleOTAction(this.getAttribute('data-ot-approve'), 'approved'); }); });
    document.querySelectorAll('[data-ot-reject]').forEach(function(btn) { btn.addEventListener('click', function() { handleOTAction(this.getAttribute('data-ot-reject'), 'rejected'); }); });
  }

  function handleOTAction(id, action) {
    sbClient.from('overtime').update({ status: action, approved_by: App.user.full_name }).eq('id', id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
    overtime = overtime.map(function(o) {
      if (o.id === id) {
        App.addNotification({ user_id: o.employee_id, type: action === 'approved' ? 'overtime_approved' : 'overtime_rejected', title: 'Overtime ' + (action === 'approved' ? 'Approved ✅' : 'Rejected ❌'), message: 'Your ' + o.hours + 'h overtime on ' + formatDate(o.date) + ' has been ' + action + '.' });
        return Object.assign({}, o, { status: action, approved_by: App.user.full_name });
      }
      return o;
    });
    render(overtime);
    showToast('Overtime ' + action + '!', action === 'approved' ? 'success' : 'error');
  }

  {
    var q = sbClient.from('overtime').select('*').order('date', { ascending: false });
    if (!isHR) q = q.eq('employee_id', App.user.id);
    q.then(function(r) { if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); }
        if (r.data) { overtime = r.data; render(overtime); } });
  }
  render(overtime);
};

// ----- PAYROLL -----
Pages.payroll = function(el) {
  var isHR = App.isHR();
  var payroll = isHR ? [] : [].filter(function(p) { return p.employee_id === App.user.id; });

  var search = '';
  var monthFilter = '';
  var statusFilter = '';

  function render(data) {
    var totalPayroll = data.reduce(function(s, p) { return s + p.net_salary; }, 0);
    var paidCount = data.filter(function(p) { return p.status === 'paid'; }).length;
    var processingCount = data.filter(function(p) { return p.status === 'processing'; }).length;

    var html = '<div class="stats-grid" style="margin-bottom:24px">';
    html += _statCard('#6366f1', 'dollarSign', 'EGP ' + totalPayroll.toLocaleString(), isHR ? 'Total Payroll' : 'Total Earnings');
    if (isHR) { html += _statCard('#22c55e', 'trendingUp', paidCount, 'Paid'); html += _statCard('#f59e0b', 'fileText', processingCount, 'Processing'); }
    html += '</div>';

    html += '<div class="toolbar">';
    if (isHR) html += '<div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search employee..." id="pay-search" value="' + (search||'').replace(/"/g, '&quot;') + '"></div>';
    html += '<input type="month" class="filter-select" id="pay-month" value="' + monthFilter + '"><select class="filter-select" id="pay-status"><option value=""' + (statusFilter===''?' selected':'') + '>All Status</option><option value="paid"' + (statusFilter==='paid'?' selected':'') + '>Paid</option><option value="processing"' + (statusFilter==='processing'?' selected':'') + '>Processing</option></select>';
    html += '' + (isHR ? '<button class="btn btn-primary" id="add-payroll" style="margin-right:8px">' + icon('plus') + ' Process Salary</button>' : '') + '<button class="btn btn-outline" id="pay-export">' + icon('download') + ' Export</button></div>';

    html += '<div class="card"><div class="card-header"><div><h3>' + (isHR ? 'Payroll Records' : 'My Salary History') + '</h3><p>' + data.length + ' records</p></div></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr>';
    if (isHR) html += '<th>Employee</th><th>Department</th>';
    html += '<th>Month</th><th>Base</th><th>Overtime</th><th>Bonuses</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    data.forEach(function(p) {
      var totalDed = (p.penalties||0) + (p.late_deductions||0) + (p.absence_deductions||0);
      html += '<tr>';
      if (isHR) html += '<td style="color:var(--text-primary);font-weight:500">' + p.employee_name + '</td><td>' + p.department + '</td>';
      html += '<td style="font-weight:600">' + p.month + '</td><td>EGP ' + (p.base_salary||0).toLocaleString() + '</td>';
      html += '<td style="color:var(--accent-success)">+' + (p.overtime_pay||0).toLocaleString() + '</td>';
      html += '<td style="color:var(--accent-info)">+' + ((p.bonuses||0) + (p.performance_bonus||0)).toLocaleString() + '</td>';
      html += '<td style="color:' + (totalDed > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)') + '">' + ((totalDed||0) > 0 ? '-' + (totalDed||0).toLocaleString() : '0') + '</td>';
      html += '<td style="font-weight:800;color:var(--accent-primary-hover);font-size:0.95rem">EGP ' + (p.net_salary||0).toLocaleString() + '</td>';
      html += '<td>' + (p.status === 'paid' ? '<span class="badge badge-success"><span class="badge-dot"></span>Paid</span>' : '<span class="badge badge-warning"><span class="badge-dot"></span>Processing</span>') + '</td>';
      html += '<td><div style="display:flex;gap:4px"><button class="btn btn-ghost btn-icon" data-view-slip="' + p.id + '" title="View Slip">' + icon('eye') + '</button>';
      if (isHR && p.status === 'processing') html += '<button class="btn btn-success btn-xs" data-mark-paid="' + p.id + '">Mark Paid</button>';
      html += '</div></td></tr>';
    });
    if (data.length === 0) html += '<tr><td colspan="' + (isHR ? 10 : 8) + '" style="text-align:center;padding:40px;color:var(--text-muted)">No payroll records</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    var searchEl = document.getElementById('pay-search');
    if (searchEl && search) {
      searchEl.focus();
      searchEl.setSelectionRange(search.length, search.length);
    }

    // Events
    function applyFilters() {
      search = document.getElementById('pay-search') ? document.getElementById('pay-search').value.toLowerCase() : '';
      monthFilter = document.getElementById('pay-month').value;
      statusFilter = document.getElementById('pay-status').value;
      render(payroll.filter(function(p) {
        if (search && p.employee_name && p.employee_name.toLowerCase().indexOf(search) === -1) return false;
        if (monthFilter && p.month !== monthFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        return true;
      }));
    }
    if (document.getElementById('pay-search')) document.getElementById('pay-search').addEventListener('input', applyFilters);
    document.getElementById('pay-month').addEventListener('change', applyFilters);
    document.getElementById('pay-status').addEventListener('change', applyFilters);
    document.getElementById('pay-export').addEventListener('click', function() { exportToCSV(data, 'payroll_report'); });

    if (document.getElementById('add-payroll')) {
      document.getElementById('add-payroll').addEventListener('click', function() {
        sbClient.from('users').select('id, full_name, base_salary, department, insurance_active, insurance_start').eq('status','active').then(function(res) {
          var users = res.data || [];
          var monthVal = new Date().toISOString().substring(0,7);
          var b = '<div class="form-row"><div class="form-field"><label>Employee *</label><select id="pf-emp"><option value="">-- Select --</option>';
          users.forEach(function(u) { b += '<option value="'+u.id+'" data-name="'+u.full_name+'" data-base="'+(u.base_salary||0)+'" data-dept="'+u.department+'" data-insured="'+(u.insurance_active ? '1' : '0')+'" data-pos="'+(u.position||'')+'">'+u.full_name+' - '+u.department+ (u.insurance_active ? '' : ' (No Insurance)') +'</option>'; });
          b += '</select></div><div class="form-field"><label>Month *</label><input type="month" id="pf-m" value="'+monthVal+'"></div></div>';
          b += '<div id="pf-calc-result" style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--border-color);margin-bottom:16px;display:none"><p style="color:var(--text-muted);text-align:center">Select an employee and click Calculate</p></div>';
          b += '<div class="form-row"><div class="form-field"><label>Extra HR Bonus (Manual)</label><input type="number" id="pf-extra-b" value="0"></div><div class="form-field"><label>Extra HR Penalty (Manual)</label><input type="number" id="pf-extra-p" value="0"></div></div>';
          App.showModal('Auto-Calculate Salary', b, '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-info" id="pf-calc" style="margin-right:8px">🔄 Calculate</button><button class="btn btn-primary" id="pf-save" disabled>Save Record</button>', true);

          var calcData = null;

          document.getElementById('pf-calc').addEventListener('click', function() {
            var sel = document.getElementById('pf-emp');
            if (!sel.value) { alert('Select an employee first'); return; }
            var opt = sel.options[sel.selectedIndex];
            var empId = sel.value;
            var empName = opt.getAttribute('data-name');
            var empDept = opt.getAttribute('data-dept') + (opt.getAttribute('data-pos').indexOf('(عامل يومية)') !== -1 ? ' (عامل يومية)' : '');
            var base = Number(opt.getAttribute('data-base')) || 0;
            var isInsured = opt.getAttribute('data-insured') === '1';
            var month = document.getElementById('pf-m').value;
            if (!month) { alert('Select a month'); return; }

            var resultDiv = document.getElementById('pf-calc-result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<p style="text-align:center;color:var(--text-muted)">⏳ Calculating...</p>';

            // Fetch overtime, adjustments, and attendance for the month
            var monthStart = month + '-01';
            var monthEnd = month + '-31';
            Promise.all([
              sbClient.from('overtime').select('hours, rate').eq('employee_id', empId).eq('status', 'approved').gte('date', monthStart).lte('date', monthEnd),
              sbClient.from('salary_adjustments').select('type, amount').eq('employee_id', empId).eq('status', 'approved').eq('month', month),
              sbClient.from('attendance').select('id, date').eq('employee_id', empId).gte('date', monthStart).lte('date', monthEnd)
            ]).then(function(results) {
              var otRecords = results[0].data || [];
              var adjRecords = results[1].data || [];
              var attRecords = results[2].data || [];

              // Working days: 26 with insurance, 30 without
              var workingDays = isInsured ? 26 : 30;
              var dailyRate = base / workingDays;

              // Calculate overtime pay: (base/workingDays/8) * hours * rate
              var hourlyRate = dailyRate / 8;
              var totalOTPay = 0;
              otRecords.forEach(function(ot) { totalOTPay += hourlyRate * (ot.hours || 0) * (ot.rate || 1.5); });
              totalOTPay = Math.round(totalOTPay);

              // Calculate adjustments
              var totalBonuses = 0; var totalPenalties = 0;
              adjRecords.forEach(function(adj) {
                if (adj.type === 'bonus') totalBonuses += (adj.amount || 0);
                else totalPenalties += (adj.amount || 0);
              });

              var attendedDays = attRecords.length;
              var extraB = Number(document.getElementById('pf-extra-b').value) || 0;
              var extraP = Number(document.getElementById('pf-extra-p').value) || 0;

              var isDailyWorker = empDept.indexOf('(عامل يومية)') !== -1;
              var absenceDeduction = 0;
              var totalEarnings = 0;
              var absentDays = 0;

              if (isDailyWorker) {
                totalEarnings = Math.round(dailyRate * attendedDays) + totalOTPay + totalBonuses + extraB;
                base = Math.round(dailyRate * attendedDays); // Display base explicitly as what was realistically earned via attendance
              } else {
                absentDays = Math.max(0, workingDays - attendedDays);
                absenceDeduction = Math.round(absentDays * dailyRate);
                totalEarnings = base + totalOTPay + totalBonuses + extraB;
              }

              var totalDeductions = totalPenalties + absenceDeduction + extraP;
              var net = totalEarnings - totalDeductions;

              calcData = {
                employee_id: empId, employee_name: empName, department: empDept,
                month: month, base_salary: base,
                overtime_pay: totalOTPay, bonuses: totalBonuses + extraB,
                performance_bonus: 0,
                penalties: totalPenalties + extraP,
                late_deductions: 0, absence_deductions: absenceDeduction,
                net_salary: net, status: 'processing'
              };

              // Build cumulative daily salary breakdown
              var cumulativeHtml = '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)"><h4 style="font-weight:700;font-size:0.8rem;margin-bottom:8px">📅 Cumulative Daily Earnings (÷' + workingDays + ' days' + (isInsured ? ', with insurance' : ', no insurance') + ')</h4>';
              cumulativeHtml += '<div style="max-height:180px;overflow-y:auto;font-size:0.78rem">';
              for (var d = 1; d <= Math.min(attendedDays, workingDays); d++) {
                var cumAmount = Math.round(dailyRate * d);
                var barWidth = Math.round((d / workingDays) * 100);
                cumulativeHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="min-width:55px;color:var(--text-muted)">Day ' + d + '</span><div style="flex:1;background:var(--bg-secondary);border-radius:4px;height:18px;overflow:hidden"><div style="width:' + barWidth + '%;height:100%;background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:4px"></div></div><span style="min-width:85px;text-align:right;font-weight:600">EGP ' + cumAmount.toLocaleString() + '</span></div>';
              }
              cumulativeHtml += '</div></div>';

              resultDiv.innerHTML = '<h4 style="font-weight:700;margin-bottom:12px;font-size:0.9rem">📊 Salary Breakdown - ' + empName + (isInsured ? '' : ' 🚫 No Insurance') + '</h4>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem">' +
                '<div style="color:var(--text-secondary)">Base Salary:</div><div style="font-weight:600">EGP ' + base.toLocaleString() + '</div>' +
                '<div style="color:var(--text-secondary)">Salary Division:</div><div style="font-weight:600">÷ ' + workingDays + ' days = EGP ' + Math.round(dailyRate).toLocaleString() + '/day</div>' +
                '<div style="color:var(--accent-success)">Overtime (' + otRecords.length + ' records):</div><div style="font-weight:600;color:var(--accent-success)">+EGP ' + totalOTPay.toLocaleString() + '</div>' +
                '<div style="color:var(--accent-info)">Bonuses (' + adjRecords.filter(function(a){return a.type==="bonus"}).length + ' approved):</div><div style="font-weight:600;color:var(--accent-info)">+EGP ' + (totalBonuses + extraB).toLocaleString() + '</div>' +
                '<div style="color:var(--accent-danger)">Penalties:</div><div style="font-weight:600;color:var(--accent-danger)">-EGP ' + (totalPenalties + extraP).toLocaleString() + '</div>' +
                '<div style="color:var(--accent-danger)">Absence (' + absentDays + ' days):</div><div style="font-weight:600;color:var(--accent-danger)">-EGP ' + absenceDeduction.toLocaleString() + '</div>' +
                '<div style="color:var(--text-secondary)">Attended Days:</div><div style="font-weight:600">' + attendedDays + ' / ' + workingDays + '</div>' +
                '</div>' +
                '<div style="border-top:2px solid var(--accent-primary);margin-top:12px;padding-top:12px;display:flex;justify-content:space-between;align-items:center"><span style="font-weight:800;font-size:1rem">NET SALARY</span><span style="font-weight:900;font-size:1.3rem;color:var(--accent-primary-hover)">EGP ' + net.toLocaleString() + '</span></div>' +
                cumulativeHtml;

              document.getElementById('pf-save').removeAttribute('disabled');
            });
          });

          document.getElementById('pf-save').addEventListener('click', function() {
            if (!calcData) { alert('Click Calculate first'); return; }
            // Recalculate with latest extra values
            var extraB = Number(document.getElementById('pf-extra-b').value) || 0;
            var extraP = Number(document.getElementById('pf-extra-p').value) || 0;
            calcData.bonuses = (calcData.bonuses || 0);
            calcData.penalties = (calcData.penalties || 0);

            sbClient.from('payroll').insert([calcData]).select().single().then(function(s) {
              if (s.error) { alert('Error: ' + s.error.message); return; }
              if (s.data) { payroll.unshift(s.data); render(payroll); App.closeModal(); showToast('Salary calculated & saved!', 'success'); }
            });
          });
        });
      });
    }

    document.querySelectorAll('[data-view-slip]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var p = payroll.find(function(x) { return x.id === this.getAttribute('data-view-slip'); }.bind(this));
        if (!p) return;
        var body = '<div style="padding:24px;background:var(--bg-tertiary);border-radius:var(--radius-lg);border:1px solid var(--border-color)">';
        body += '<div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border-color)"><h2 style="font-size:1.2rem;font-weight:800;margin-bottom:4px">Smart Factory</h2><p style="color:var(--text-tertiary);font-size:0.82rem">Salary Slip - ' + p.month + '</p><p style="color:var(--text-tertiary);font-size:0.82rem">' + p.employee_name + ' — ' + p.department + '</p></div>';
        body += '<h4 style="font-size:0.8rem;font-weight:700;color:var(--accent-success);margin-bottom:12px">EARNINGS</h4><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">';
        [['Base Salary', p.base_salary||0], ['Overtime Pay', p.overtime_pay||0], ['Bonuses', p.bonuses||0], ['Performance Bonus', p.performance_bonus||0]].forEach(function(item) {
          body += '<div style="display:flex;justify-content:space-between;font-size:0.88rem"><span style="color:var(--text-secondary)">' + item[0] + '</span><span style="font-weight:600">EGP ' + (item[1]||0).toLocaleString() + '</span></div>';
        });
        body += '</div><h4 style="font-size:0.8rem;font-weight:700;color:var(--accent-danger);margin-bottom:12px">DEDUCTIONS</h4><div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">';
        [['Penalties', p.penalties||0], ['Late Deductions', p.late_deductions||0], ['Absence Deductions', p.absence_deductions||0]].forEach(function(item) {
          body += '<div style="display:flex;justify-content:space-between;font-size:0.88rem"><span style="color:var(--text-secondary)">' + item[0] + '</span><span style="font-weight:600;color:' + (item[1] > 0 ? 'var(--accent-danger)' : 'inherit') + '">' + (item[1] > 0 ? '-EGP ' + (item[1]||0).toLocaleString() : 'EGP 0') + '</span></div>';
        });
        body += '</div><div style="border-top:2px solid var(--accent-primary);padding-top:16px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:1rem;font-weight:800">NET SALARY</span><span style="font-size:1.4rem;font-weight:900;color:var(--accent-primary-hover)">EGP ' + (p.net_salary||0).toLocaleString() + '</span></div>';
        if (p.paid_date) body += '<p style="text-align:center;margin-top:16px;font-size:0.78rem;color:var(--accent-success)">✅ Paid on ' + formatDate(p.paid_date) + '</p>';
        body += '</div>';
        App.showModal('💰 Salary Slip - ' + p.month, body, '', true);
      });
    });

    document.querySelectorAll('[data-mark-paid]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-mark-paid');
        sbClient.from('payroll').update({ status: 'paid', paid_date: todayStr() }).eq('id', id).then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
        payroll = payroll.map(function(p) {
          if (p.id === id) {
            App.addNotification({ user_id: p.employee_id, type: 'salary_ready', title: '💰 Salary Processed', message: 'Your ' + p.month + ' salary of EGP ' + (p.net_salary||0).toLocaleString() + ' has been processed.' });
            EmailService.sendEmail({ userId: p.employee_id, toName: p.employee_name, subject: 'Salary Processed - ' + p.month, htmlContent: '<h2>Salary Update</h2><p>Hello ' + p.employee_name + ',</p><p>Your salary for <strong>' + p.month + '</strong> has been processed.</p><p><strong>Net Salary:</strong> EGP ' + (p.net_salary||0).toLocaleString() + '</p><p>Smart Factory HR</p>' });
            return Object.assign({}, p, { status: 'paid', paid_date: todayStr() });
          }
          return p;
        });
        render(payroll);
        showToast('Salary marked as paid!', 'success');
      });
    });
  }

  {
    var q = sbClient.from('payroll').select('*').order('month', { ascending: false });
    if (!isHR) q = q.eq('employee_id', App.user.id);
    q.then(function(r) { if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); }
        if (r.data) { payroll = r.data; render(payroll); } });
  }
  render(payroll);
};

// ----- ANNOUNCEMENTS -----
Pages.announcements = function(el) {
  var isHR = App.isHR();
  var announcements = [];
  var visible = isHR ? announcements : announcements.filter(function(a) { return a.department === 'All' || a.department.indexOf(App.user.department) !== -1; });

  function render() {
    var html = '';
    if (isHR) html += '<div class="toolbar"><div style="flex:1"></div><button class="btn btn-primary" id="post-ann-btn">' + icon('plus') + ' Post Announcement</button></div>';
    html += '<div style="display:flex;flex-direction:column;gap:16px">';
    var priorityIcons = { high: 'alertTriangle', medium: 'bell', low: 'info' };
    var priorityColors = { high: { bg: 'var(--accent-danger-soft)', color: '#ef4444' }, medium: { bg: 'var(--accent-warning-soft)', color: '#f59e0b' }, low: { bg: 'var(--accent-info-soft)', color: '#3b82f6' } };
    visible.forEach(function(a) {
      var pc = priorityColors[a.priority] || priorityColors.medium;
      html += '<div class="announcement-item ' + a.priority + '"><div style="display:flex;align-items:flex-start;gap:12px"><div style="width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + pc.bg + '">' + icon(priorityIcons[a.priority] || 'info', 18) + '</div><div style="flex:1"><div class="announcement-title">' + a.title + '</div><div class="announcement-msg">' + a.message + '</div><div class="announcement-meta"><span>📅 ' + formatDate(a.created_at) + '</span><span>👤 ' + a.created_by + '</span><span>🏢 ' + a.department + '</span><span class="badge ' + (a.priority === 'high' ? 'badge-danger' : a.priority === 'medium' ? 'badge-warning' : 'badge-info') + '">' + a.priority + '</span></div></div></div></div>';
    });
    if (visible.length === 0) html += '<div class="empty-state" style="padding:60px">' + icon('megaphone', 40) + '<p>No announcements yet</p></div>';
    html += '</div>';
    el.innerHTML = html;

    if (document.getElementById('post-ann-btn')) document.getElementById('post-ann-btn').addEventListener('click', function() {
      var body = '<div class="form-field" style="margin-bottom:16px"><label>Title</label><input id="af-title" placeholder="Announcement title..."></div>';
      body += '<div class="form-field" style="margin-bottom:16px"><label>Message</label><textarea id="af-msg" placeholder="Write your announcement..." style="min-height:120px"></textarea></div>';
      body += '<div class="form-row"><div class="form-field"><label>Priority</label><select id="af-priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div><div class="form-field"><label>Target Department</label><select id="af-dept"><option value="All">All Departments</option>';
      DEPARTMENTS.forEach(function(d) { body += '<option value="' + d + '">' + d + '</option>'; });
      body += '</select></div></div>';
      App.showModal('📢 Post Announcement', body, '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="publish-ann">Publish Announcement</button>', true);
      document.getElementById('publish-ann').addEventListener('click', function() {
        var title = document.getElementById('af-title').value;
        var msg = document.getElementById('af-msg').value;
        var priority = document.getElementById('af-priority').value;
        var dept = document.getElementById('af-dept').value;
        if (!title || !msg) return;
        var newAnn = { title: title, message: msg, priority: priority, department: dept, created_by: App.user.full_name, created_at: new Date().toISOString() };
        sbClient.from('announcements').insert([newAnn]).select().single().then(function(r) { if(r && r.error) { console.error("Supabase Error:", r.error); alert("DB Error: " + r.error.message); } });
        announcements.unshift(newAnn);
        visible = isHR ? announcements : announcements.filter(function(a) { return a.department === 'All' || a.department.indexOf(App.user.department) !== -1; });

        EmailService.sendAnnouncementEmail({ department: dept, subject: 'New Announcement: ' + title, htmlContent: '<h2>New Announcement: ' + title + '</h2><p><strong>Priority:</strong> ' + priority.toUpperCase() + '</p><p><strong>From:</strong> ' + App.user.full_name + '</p><hr><p>' + msg.replace(/\n/g, '<br>') + '</p><hr><p><small>Broadcast to: ' + dept + '</small></p>' });

        App.closeModal();
        render();
        showToast('Announcement published!', 'success');
      });
    });
  }

  {
    sbClient.from('announcements').select('*').order('created_at', { ascending: false }).then(function(r) { if (r.error) { alert('DB Error: ' + r.error.message + (r.error.details ? ' - ' + r.error.details : '')); console.error(r.error); }
        if (r.data) { announcements = r.data; visible = isHR ? announcements : announcements.filter(function(a) { return a.department === 'All' || a.department.indexOf(App.user.department) !== -1; }); render(); } });
  }
  render();
};

// ----- REPORTS -----
Pages.reports = function(el) {
  var employees = [];
  var attendance = [];
  var leaves = [];
  var payroll = [];
  var activeReport = 'attendance';

  function render() {
    var html = '<div style="margin-bottom:24px;border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:4px;background:var(--bg-card);display:inline-flex;gap:0">';
    [{ id: 'attendance', label: '📊 Attendance' }, { id: 'absenteeism', label: '🔴 Absenteeism' }, { id: 'performance', label: '📈 Dept Performance' }, { id: 'leaves', label: '🏖️ Leave Analytics' }].forEach(function(tab) {
      html += '<button class="tab' + (activeReport === tab.id ? ' active' : '') + '" data-report="' + tab.id + '" style="border-bottom:none;border-radius:var(--radius-md);margin:0;background:' + (activeReport === tab.id ? 'var(--accent-primary-soft)' : 'transparent') + '">' + tab.label + '</button>';
    });
    html += '</div>';

    html += '<div class="card"><div class="card-header"><div><h3>' + { attendance: '📊 Monthly Attendance Report', absenteeism: '🔴 Absenteeism Analysis', performance: '📈 Department Performance', leaves: '🏖️ Leave Analytics' }[activeReport] + '</h3></div><button class="btn btn-outline" id="rpt-export">' + icon('download') + ' Export CSV</button></div><div class="chart-container" style="height:350px;padding:24px"><canvas id="report-chart"></canvas></div></div>';

    el.innerHTML = html;

    document.querySelectorAll('[data-report]').forEach(function(btn) { btn.addEventListener('click', function() { activeReport = this.getAttribute('data-report'); render(); }); });
    document.getElementById('rpt-export').addEventListener('click', function() { exportToCSV(activeReport === 'attendance' ? attendance : leaves, activeReport + '_report'); });

    setTimeout(function() {
      var ctx = document.getElementById('report-chart');
      if (!ctx) return;
      var chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, font: { size: 11 } } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { display: false }, border: { display: false } }, y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(148,163,184,0.06)' }, border: { display: false } } } };
      if (activeReport === 'attendance') {
        var attData = {};
        DEPARTMENTS.forEach(function(d) { var recs = attendance.filter(function(a) { return a.department === d; }); attData[d] = { present: recs.filter(function(a) { return a.status === 'present' || a.status === 'checked_in'; }).length, absent: recs.filter(function(a) { return a.status === 'absent'; }).length, late: recs.filter(function(a) { return a.delay_minutes > 0; }).length }; });
        new Chart(ctx, { type: 'bar', data: { labels: DEPARTMENTS, datasets: [{ label: 'Present', data: DEPARTMENTS.map(function(d) { return attData[d].present; }), backgroundColor: '#22c55e', borderRadius: 4 }, { label: 'Absent', data: DEPARTMENTS.map(function(d) { return attData[d].absent; }), backgroundColor: '#ef4444', borderRadius: 4 }, { label: 'Late', data: DEPARTMENTS.map(function(d) { return attData[d].late; }), backgroundColor: '#f59e0b', borderRadius: 4 }] }, options: chartOpts });
      } else if (activeReport === 'absenteeism') {
        var empAbsent = {};
        attendance.filter(function(a) { return a.status === 'absent'; }).forEach(function(a) { empAbsent[a.employee_name] = (empAbsent[a.employee_name] || 0) + 1; });
        new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(empAbsent), datasets: [{ data: Object.values(empAbsent), backgroundColor: ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'], borderWidth: 0 }] }, options: Object.assign({}, chartOpts, { scales: undefined, cutout: '60%' }) });
      } else if (activeReport === 'performance') {
        var deptPerf = {};
        DEPARTMENTS.forEach(function(d) { var dp = payroll.filter(function(p) { return p.department === d; }); deptPerf[d] = { avg: dp.length ? Math.round(dp.reduce(function(s, p) { return s + p.net_salary; }, 0) / dp.length) : 0, bonus: dp.length ? Math.round(dp.reduce(function(s, p) { return s + p.performance_bonus; }, 0) / dp.length) : 0 }; });
        new Chart(ctx, { type: 'line', data: { labels: DEPARTMENTS, datasets: [{ label: 'Avg Salary', data: DEPARTMENTS.map(function(d) { return deptPerf[d].avg; }), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.4, fill: true }, { label: 'Avg Performance Bonus', data: DEPARTMENTS.map(function(d) { return deptPerf[d].bonus; }), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true }] }, options: chartOpts });
      } else if (activeReport === 'leaves') {
        var leaveByType = {};
        leaves.forEach(function(l) { leaveByType[l.type] = (leaveByType[l.type] || 0) + 1; });
        new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(leaveByType), datasets: [{ data: Object.values(leaveByType), backgroundColor: ['#6366f1', '#ef4444', '#f59e0b', '#06b6d4', '#a855f7'], borderWidth: 0 }] }, options: Object.assign({}, chartOpts, { scales: undefined, cutout: '60%' }) });
      }
    }, 50);
  }
  render();
};

// ----- AUDIT LOG -----
Pages.auditLog = function(el) {
  var logs = [];
  var actionTypes = [];
  logs.forEach(function(l) { if (actionTypes.indexOf(l.action) === -1) actionTypes.push(l.action); });

  function render(data) {
    var html = '<div class="toolbar"><div class="search-wrapper"><span class="search-icon">' + icon('search') + '</span><input type="text" class="search-input" placeholder="Search by user or details..." id="al-search"></div>';
    html += '<select class="filter-select" id="al-action"><option value="">All Actions</option>';
    actionTypes.forEach(function(a) { html += '<option value="' + a + '">' + a.replace(/_/g, ' ') + '</option>'; });
    html += '</select><input type="date" class="filter-select" id="al-date"><button class="btn btn-outline" id="al-export">' + icon('download') + ' Export</button></div>';

    html += '<div class="card"><div class="card-header"><div><h3>🔒 System Audit Log</h3><p>' + data.length + ' events recorded</p></div></div><div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr><th>Timestamp</th><th>Action</th><th>User</th><th>Details</th><th>IP Address</th></tr></thead><tbody>';
    data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); }).forEach(function(log) {
      html += '<tr><td style="font-family:monospace;font-size:0.78rem">' + formatDateTime(log.timestamp) + '</td><td><span class="audit-action audit-' + log.action + '">' + log.action.replace(/_/g, ' ') + '</span></td><td style="color:var(--text-primary);font-weight:500">' + log.user + '</td><td style="max-width:300px">' + log.details + '</td><td style="font-family:monospace;font-size:0.78rem;color:var(--text-muted)">' + log.ip + '</td></tr>';
    });
    if (data.length === 0) html += '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">No audit entries found</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    function applyFilters() {
      var s = document.getElementById('al-search').value.toLowerCase();
      var action = document.getElementById('al-action').value;
      var date = document.getElementById('al-date').value;
      render(logs.filter(function(l) {
        if (s && l.user.toLowerCase().indexOf(s) === -1 && l.details.toLowerCase().indexOf(s) === -1) return false;
        if (action && l.action !== action) return false;
        if (date && l.timestamp.indexOf(date) === -1) return false;
        return true;
      }));
    }
    document.getElementById('al-search').addEventListener('input', applyFilters);
    document.getElementById('al-action').addEventListener('change', applyFilters);
    document.getElementById('al-date').addEventListener('change', applyFilters);
    document.getElementById('al-export').addEventListener('click', function() { exportToCSV(data, 'audit_log'); });
  }

  {
    sbClient.from('audit_log').select('*').order('timestamp', { ascending: false }).then(function(r) {
      if (r.error) { console.error('Audit Load Error:', r.error); el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--accent-danger)">Error loading audit log: ' + r.error.message + '</div>'; return; }
      if (r.data) { logs = r.data.map(function(l) { return Object.assign({}, l, { user: l.user_name, timestamp: l.timestamp, ip: l.ip || '127.0.0.1' }); }); actionTypes = []; logs.forEach(function(l) { if (actionTypes.indexOf(l.action) === -1) actionTypes.push(l.action); }); render(logs); }
    });
  }
  render(logs);
};

// ----- MANAGER: TEAM ADJUSTMENTS -----
Pages.teamAdjustments = function(el) {
  var adjustments = [];
  var teamMembers = [];

  function render() {
    var html = '<div class="toolbar">';
    html += '<button class="btn btn-primary" id="add-adj-btn">' + icon('plus') + ' Submit Bonus / Penalty</button>';
    html += '</div>';

    html += '<div class="card"><div class="card-header"><div><h3>My Submitted Adjustments</h3><p>' + adjustments.length + ' requests</p></div></div>';
    html += '<div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Amount (EGP)</th><th>Reason</th><th>Month</th><th>Status</th></tr></thead><tbody>';
    adjustments.forEach(function(a) {
      var typeClass = a.type === 'bonus' ? 'badge-success' : 'badge-danger';
      var typeLabel = a.type === 'bonus' ? '🎁 Bonus' : '⚠️ Penalty';
      var statusClass = a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning';
      html += '<tr><td style="font-weight:600">' + a.employee_name + '</td><td>' + (a.department || '') + '</td>';
      html += '<td><span class="badge ' + typeClass + '">' + typeLabel + '</span></td>';
      html += '<td style="font-weight:700">EGP ' + (a.amount || 0).toLocaleString() + '</td>';
      html += '<td>' + (a.reason || '') + '</td><td>' + (a.month || '') + '</td>';
      html += '<td><span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + a.status + '</span></td></tr>';
    });
    if (adjustments.length === 0) html += '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No adjustments submitted yet</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    document.getElementById('add-adj-btn').addEventListener('click', function() {
      var monthVal = new Date().toISOString().substring(0, 7);
      var b = '<div class="form-row"><div class="form-field"><label>Employee *</label><select id="adj-emp"><option value="">-- Select --</option>';
      teamMembers.forEach(function(u) { b += '<option value="' + u.id + '" data-name="' + u.full_name + '" data-dept="' + u.department + '">' + u.full_name + '</option>'; });
      b += '</select></div><div class="form-field"><label>Type *</label><select id="adj-type"><option value="bonus">🎁 Bonus (Reward)</option><option value="penalty">⚠️ Penalty (Deduction)</option></select></div></div>';
      b += '<div class="form-row"><div class="form-field"><label>Amount (EGP) *</label><input type="number" id="adj-amount" min="1" placeholder="e.g. 500"></div><div class="form-field"><label>Month *</label><input type="month" id="adj-month" value="' + monthVal + '"></div></div>';
      b += '<div class="form-field"><label>Reason *</label><textarea id="adj-reason" placeholder="Describe the reason..."></textarea></div>';
      App.showModal('Submit Bonus / Penalty', b, '<button class="btn btn-outline" onclick="App.closeModal()">Cancel</button><button class="btn btn-primary" id="adj-save">Submit for Approval</button>');

      document.getElementById('adj-save').addEventListener('click', function() {
        var sel = document.getElementById('adj-emp');
        var type = document.getElementById('adj-type').value;
        var amount = Number(document.getElementById('adj-amount').value);
        var month = document.getElementById('adj-month').value;
        var reason = document.getElementById('adj-reason').value;
        if (!sel.value || !amount || !reason) { alert('Please fill all required fields'); return; }
        var opt = sel.options[sel.selectedIndex];

        var rec = { employee_id: sel.value, employee_name: opt.getAttribute('data-name'), department: opt.getAttribute('data-dept'), type: type, amount: amount, reason: reason, month: month, requested_by: App.user.full_name, status: 'pending' };
        sbClient.from('salary_adjustments').insert([rec]).select().single().then(function(r) {
          if (r.error) { alert('Error: ' + r.error.message); return; }
          if (r.data) { adjustments.unshift(r.data); App.closeModal(); render(); showToast('Adjustment submitted!', 'success'); }
        });
      });
    });
  }

  // Load team members (same department) and existing adjustments
  var dept = App.user.department;
  Promise.all([
    sbClient.from('users').select('id, full_name, department').eq('department', dept).eq('role', 'employee'),
    sbClient.from('salary_adjustments').select('*').eq('requested_by', App.user.full_name).order('created_at', { ascending: false })
  ]).then(function(results) {
    teamMembers = (results[0].data || []);
    adjustments = (results[1].data || []);
    render();
  });
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading team data...</div>';
};

// ----- HR: SALARY ADJUSTMENTS APPROVAL -----
Pages.hrAdjustments = function(el) {
  var adjustments = [];
  var filterStatus = '';

  function render(data) {
    data = data || adjustments;
    var pending = data.filter(function(a) { return a.status === 'pending'; });
    var html = '<div class="stats-grid">';
    html += _statCard('#f59e0b', 'timer', pending.length, 'Pending Requests');
    html += _statCard('#10b981', 'checkCheck', data.filter(function(a) { return a.status === 'approved'; }).length, 'Approved');
    html += _statCard('#ef4444', 'x', data.filter(function(a) { return a.status === 'rejected'; }).length, 'Rejected');
    html += _statCard('#6366f1', 'dollarSign', 'EGP ' + data.reduce(function(s, a) { return s + (a.status === 'approved' ? (a.type === 'bonus' ? a.amount : -a.amount) : 0); }, 0).toLocaleString(), 'Net Impact');
    html += '</div>';

    html += '<div class="toolbar"><select class="filter-select" id="adj-filter"><option value="">All Status</option><option value="pending"' + (filterStatus === 'pending' ? ' selected' : '') + '>Pending</option><option value="approved"' + (filterStatus === 'approved' ? ' selected' : '') + '>Approved</option><option value="rejected"' + (filterStatus === 'rejected' ? ' selected' : '') + '>Rejected</option></select></div>';

    html += '<div class="card"><div class="card-header"><div><h3>Salary Adjustment Requests</h3><p>' + data.length + ' requests from managers</p></div></div>';
    html += '<div class="card-body no-pad"><div class="table-container"><table class="data-table"><thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Amount</th><th>Reason</th><th>Requested By</th><th>Month</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    data.forEach(function(a) {
      var typeClass = a.type === 'bonus' ? 'badge-success' : 'badge-danger';
      var typeLabel = a.type === 'bonus' ? '🎁 Bonus' : '⚠️ Penalty';
      var statusClass = a.status === 'approved' ? 'badge-success' : a.status === 'rejected' ? 'badge-danger' : 'badge-warning';
      html += '<tr><td style="font-weight:600">' + a.employee_name + '</td><td>' + (a.department || '') + '</td>';
      html += '<td><span class="badge ' + typeClass + '">' + typeLabel + '</span></td>';
      html += '<td style="font-weight:700">EGP ' + (a.amount || 0).toLocaleString() + '</td>';
      html += '<td style="max-width:200px">' + (a.reason || '') + '</td>';
      html += '<td>' + (a.requested_by || '') + '</td><td>' + (a.month || '') + '</td>';
      html += '<td><span class="badge ' + statusClass + '"><span class="badge-dot"></span>' + a.status + '</span></td>';
      html += '<td>';
      if (a.status === 'pending') {
        var canApprove = true;
        if (App.user.role === 'hr') {
          var perms = App.user.permissions || {};
          if (!perms.can_adjust_salary) canApprove = false;
        }
        if (canApprove) {
          html += '<div style="display:flex;gap:4px"><button class="btn btn-success btn-xs" data-adj-approve="' + a.id + '">Approve</button><button class="btn btn-xs" style="background:var(--accent-danger);color:#fff" data-adj-reject="' + a.id + '">Reject</button></div>';
        } else {
          html += '<span style="color:var(--accent-danger);font-size:0.75rem">Blocked (No Roles Perm)</span>';
        }
      } else { html += '<span style="color:var(--text-muted);font-size:0.78rem">Done</span>'; }
      html += '</td></tr>';
    });
    if (data.length === 0) html += '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">No adjustment requests</td></tr>';
    html += '</tbody></table></div></div></div>';
    el.innerHTML = html;

    // Events
    document.getElementById('adj-filter').addEventListener('change', function() {
      filterStatus = this.value;
      render(filterStatus ? adjustments.filter(function(a) { return a.status === filterStatus; }) : adjustments);
    });

    document.querySelectorAll('[data-adj-approve]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-adj-approve');
        sbClient.from('salary_adjustments').update({ status: 'approved' }).eq('id', id).then(function(r) {
          if (r && r.error) { alert('Error: ' + r.error.message); return; }
          adjustments = adjustments.map(function(a) { if (a.id === id) a.status = 'approved'; return a; });
          render(filterStatus ? adjustments.filter(function(a) { return a.status === filterStatus; }) : adjustments);
          showToast('Adjustment approved!', 'success');
        });
      });
    });

    document.querySelectorAll('[data-adj-reject]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = this.getAttribute('data-adj-reject');
        sbClient.from('salary_adjustments').update({ status: 'rejected' }).eq('id', id).then(function(r) {
          if (r && r.error) { alert('Error: ' + r.error.message); return; }
          adjustments = adjustments.map(function(a) { if (a.id === id) a.status = 'rejected'; return a; });
          render(filterStatus ? adjustments.filter(function(a) { return a.status === filterStatus; }) : adjustments);
          showToast('Adjustment rejected', 'info');
        });
      });
    });
  }

  sbClient.from('salary_adjustments').select('*').order('created_at', { ascending: false }).then(function(r) {
    if (r.error) { alert('DB Error: ' + r.error.message); el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--accent-danger)">Error loading adjustments</div>'; console.error(r.error); return; }
    if (r.data) { adjustments = r.data; render(); }
  });
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading adjustments...</div>';
};

// ========== STAT CARD HELPER ==========
function _statCard(color, iconName, value, label, trendHtml) {
  return '<div class="stat-card" style="--stat-color:' + color + '"><div class="stat-card-header"><div class="stat-card-icon" style="background:' + color + '20">' + icon(iconName, 20) + '</div>' + (trendHtml || '') + '</div><div class="stat-card-value">' + value + '</div><div class="stat-card-label">' + label + '</div></div>';
}

// ========== START APP ==========
document.addEventListener('DOMContentLoaded', function() { App.init(); });

