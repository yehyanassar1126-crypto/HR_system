# Smart Factory HR & Workforce Management System

A secure, web-based platform designed for industrial environments to manage departments, employees, attendance, leaves, shifts, overtime, and payroll.

## Features
- Role-based Authentication (HR / Employee)
- Interactive Dashboard with Stats & Charts 
- Attendance & QR Code Check-In
- Leave Management & Approvals
- Shift & Overtime Management
- Advanced Payroll Calculation
- Real-time Push Notifications
- Advanced Reporting & CSV Exports
- Audit Logs

## Tech Stack
- Frontend: React + Vite + Vanilla CSS
- Backend: Supabase (PostgreSQL, Auth, Realtime)
- Charts: Chart.js / React-Chartjs-2
- Icons: Lucide React

## Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure your `.env` variables from `.env.example`
4. Run the SQL schema in `supabase_schema.sql` on your Supabase dashboard
5. Start dev server: `npm run dev`

## Deployment
This project is configured out-of-the-box for seamless Vercel deployment with the included `vercel.json` configuration file.
