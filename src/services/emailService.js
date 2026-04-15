import { supabase, isDemoMode } from '../supabaseClient';
import { mockEmployees } from '../utils/mockData';

export const sendEmail = async ({ userId, toName, subject, htmlContent }) => {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY;
    if (!apiKey) return; // Silent skip if no API key is provided

    let userEmail = '';
    if (isDemoMode) {
        const emp = mockEmployees.find(e => e.id === userId);
        if (emp) userEmail = emp.email;
    } else {
        const { data } = await supabase.from('users').select('email').eq('id', userId).single();
        if (data) userEmail = data.email;
    }
    
    if (!userEmail) return;

    try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Smart Factory HR', email: 'hr@smartfactory.com' },
                to: [{ email: userEmail, name: toName }],
                subject: subject,
                htmlContent: htmlContent
            })
        });
    } catch (e) {
        console.error("Brevo Email Error", e);
    }
}

export const sendAnnouncementEmail = async ({ department, subject, htmlContent }) => {
    const apiKey = import.meta.env.VITE_BREVO_API_KEY;
    if (!apiKey) return;

    let emails = [];
    if (isDemoMode) {
        emails = mockEmployees
            .filter(e => department === 'All' || e.department === department)
            .map(e => ({ email: e.email, name: e.full_name }));
    } else {
        let query = supabase.from('users').select('email, full_name');
        if (department !== 'All') query = query.eq('department', department);
        const { data } = await query;
        if (data) emails = data.map(u => ({ email: u.email, name: u.full_name }));
    }

    if (!emails.length) return;

    try {
        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Smart Factory HR', email: 'hr@smartfactory.com' },
                // Use BCC for announcements so employees don't see each other's emails
                to: [{ email: 'hr@smartfactory.com', name: 'Smart Factory HR' }],
                bcc: emails,
                subject: subject,
                htmlContent: htmlContent
            })
        });
    } catch (e) {
        console.error("Brevo Announcement Error", e);
    }
}
