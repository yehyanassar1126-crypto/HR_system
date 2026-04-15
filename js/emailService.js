// ===== EMAIL SERVICE (Brevo) =====
var EmailService = {
  sendEmail: function (opts) {
    var apiKey = CONFIG.BREVO_API_KEY;
    if (!apiKey) return Promise.resolve();

    var userId = opts.userId;
    var toName = opts.toName;
    var subject = opts.subject;
    var htmlContent = opts.htmlContent;

    return sbClient.from('users').select('email').eq('id', userId).single().then(function (res) {
      if (!res.data || !res.data.email) {
        showToast('⚠️ No email address found for this user', 'warning');
        return;
      }
      return EmailService._send(res.data.email, toName, subject, htmlContent);
    });
  },

  sendAnnouncementEmail: function (opts) {
    var apiKey = CONFIG.BREVO_API_KEY;
    if (!apiKey) return Promise.resolve();

    var department = opts.department;
    var subject = opts.subject;
    var htmlContent = opts.htmlContent;

    var query = sbClient.from('users').select('email, full_name');
    if (department !== 'All') query = query.eq('department', department);

    return query.then(function (res) {
      if (!res.data || !res.data.length) return Promise.resolve();
      var emails = res.data.map(function (u) { return { email: u.email, name: u.full_name }; });
      return EmailService._sendBulk(emails, subject, htmlContent);
    });
  },

  _send: function (toEmail, toName, subject, htmlContent) {
    return fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': CONFIG.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: CONFIG.BREVO_SENDER_NAME, email: CONFIG.BREVO_SENDER_EMAIL },
        to: [{ email: toEmail, name: toName }],
        subject: subject,
        htmlContent: htmlContent
      })
    }).then(function (r) {
      if (r.ok) { showToast('📧 Email sent successfully!', 'success'); }
      else { r.text().then(function(t){ alert("يوجد مشكلة في الإيميل (Brevo API Error):\n" + t); }); }
    }).catch(function (e) { alert("Network Error: " + e.message); });
  },

  _sendBulk: function (emails, subject, htmlContent) {
    return fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': CONFIG.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: CONFIG.BREVO_SENDER_NAME, email: CONFIG.BREVO_SENDER_EMAIL },
        to: [{ email: CONFIG.BREVO_SENDER_EMAIL, name: CONFIG.BREVO_SENDER_NAME }],
        bcc: emails,
        subject: subject,
        htmlContent: htmlContent
      })
    }).then(function (r) {
      if (r.ok) { showToast('📧 Announcement emails sent!', 'success'); }
      else { r.text().then(function(t){ alert("Brevo API Error:\n" + t); }); }
    }).catch(function (e) { alert("Network Error: " + e.message); });
  }
};
