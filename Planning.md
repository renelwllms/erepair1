# E-Repair Shop Management System - Planning Document

## Project Overview
Building a modern, full-stack appliance repair shop management application with comprehensive CRM, job tracking, invoicing, and customer portal features.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Email**: Nodemailer (Office365/Gmail SMTP)
- **PDF Generation**: jsPDF or react-pdf
- **QR Code**: qrcode.react
- **Charts**: Recharts (for dashboard analytics)
- **File Upload**: Next.js API routes with local storage/S3

## Database Connection
```
postgresql://default:Pass%40888006@localhost:5432/erepairdbmain01?schema=public
```

## Core Features to Implement

### Phase 1: Foundation (Setup & Authentication)
- [x] Project structure with Next.js 14 + TypeScript
- [ ] Prisma setup with PostgreSQL
- [ ] Database schema design (11 core tables)
- [ ] NextAuth.js authentication with roles (Admin, Technician, Customer)
- [ ] Basic layout and navigation
- [ ] User management interface

### Phase 2: Customer CRM
- [ ] Customer CRUD operations
- [ ] Customer profile with full details
- [ ] Search and filter functionality
- [ ] Customer job history view
- [ ] Quick actions (call, email, create job)
- [ ] Export to CSV

### Phase 3: Job Management System
- [ ] Internal job creation (staff)
- [ ] Job status workflow (Open → In Progress → Awaiting Parts → Ready for Pickup → Closed → Cancelled)
- [ ] Job details view with timeline
- [ ] Technician notes and customer communication log
- [ ] Parts used tracking
- [ ] Before/after photo uploads
- [ ] Job assignment to technicians

### Phase 4: Customer Portal & QR Code
- [ ] QR code generation for shop
- [ ] Customer job submission form (simplified)
- [ ] Customer portal login
- [ ] Customer job status view
- [ ] Email confirmation system

### Phase 5: Email Notification System
- [ ] Email service configuration (Office365/Gmail SMTP)
- [ ] Email templates (job confirmation, status updates, invoices)
- [ ] Automatic notifications on job status changes
- [ ] Email log tracking
- [ ] Test email functionality

### Phase 6: Invoicing System
- [ ] Invoice creation from jobs
- [ ] Line items (parts, labor, service fees, taxes, discounts)
- [ ] Professional PDF generation with company logo
- [ ] Email invoices to customers
- [ ] Payment status tracking
- [ ] Payment history
- [ ] Auto-prompt invoice creation when job closed

### Phase 7: Dashboard & Analytics
- [ ] Key metrics cards (jobs, revenue, completion time)
- [ ] Jobs trend line chart (12 months)
- [ ] Appliance types pie chart
- [ ] Brands serviced pie chart
- [ ] Monthly revenue bar chart
- [ ] Job status distribution donut chart
- [ ] Technician performance table
- [ ] Quick actions panel
- [ ] Recent activity feed

### Phase 8: Settings & Configuration
- [ ] Email integration settings
- [ ] User management (CRUD)
- [ ] Business settings (company info, tax rates, labor rates)
- [ ] Email templates editor
- [ ] Job/Invoice number format configuration
- [ ] Reminder settings

### Phase 9: Additional Features
- [ ] Parts inventory management
- [ ] Calendar/scheduling system
- [ ] Reporting (financial, job completion, technician productivity)
- [ ] Document management
- [ ] Global search functionality

### Phase 10: Polish & Deployment
- [ ] Mobile responsiveness
- [ ] PWA capabilities
- [ ] Error handling and validation
- [ ] Loading states and optimistic updates
- [ ] Security hardening
- [ ] Testing
- [ ] Documentation
- [ ] Deployment setup

## Database Schema (Core Tables)

1. **users** - Authentication, roles (Admin, Technician, Customer)
2. **customers** - CRM data (name, email, phone, address, type, notes)
3. **jobs** - Job records (customer, appliance details, status, priority, assigned tech)
4. **job_status_history** - Timeline of status changes with timestamps
5. **invoices** - Invoice header (job, total, status, due date)
6. **invoice_items** - Line items (parts, labor, fees)
7. **payments** - Payment tracking (amount, method, date)
8. **parts** - Parts inventory (name, number, supplier, cost, price, stock)
9. **job_parts** - Parts used per job (junction table)
10. **email_logs** - Email notification history
11. **settings** - System configuration (email, business, rates)

## Security Requirements
- Password hashing with bcrypt
- JWT authentication with NextAuth
- Role-based access control (RBAC)
- Input validation with Zod
- SQL injection prevention (Prisma parameterized queries)
- XSS protection
- CSRF tokens
- Rate limiting on API endpoints
- Secure credential storage (environment variables)
- HTTPS enforcement

## User Roles & Permissions

### Admin
- Full access to all features
- User management
- Settings configuration
- View all analytics and reports

### Technician
- View and update jobs
- Create invoices
- View customer data
- Add technician notes
- Upload photos

### Customer
- Submit jobs via QR code portal
- View own job status
- View own invoices
- Upload additional photos/documents

## Development Approach
1. Start with database schema and Prisma setup
2. Implement authentication and role-based access
3. Build core features incrementally (CRM → Jobs → Invoicing)
4. Add customer portal and notifications
5. Implement dashboard and analytics
6. Polish UI/UX and add advanced features
7. Test thoroughly and deploy

## Next Steps
1. Initialize Next.js project with TypeScript
2. Install and configure all dependencies
3. Set up Prisma with PostgreSQL connection
4. Create database schema
5. Run migrations
6. Set up NextAuth.js authentication
7. Create base layout and navigation structure

---

**Project Start Date**: 2025-10-22
**Target Completion**: 8-10 weeks (phased approach)
**Current Phase**: Foundation Setup
