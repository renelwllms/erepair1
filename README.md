# E-Repair Shop Management System

A modern, full-stack appliance repair shop management application built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 🚀 Quick Deploy

### Ubuntu / Linux Server
```bash
wget https://raw.githubusercontent.com/YOUR_USERNAME/erepair/main/deploy-ubuntu.sh
chmod +x deploy-ubuntu.sh
sudo ./deploy-ubuntu.sh
```

### Windows Server
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/YOUR_USERNAME/erepair/main/deploy-windows.ps1" -OutFile "$env:TEMP\deploy-windows.ps1"
Set-ExecutionPolicy Bypass -Scope Process -Force
& "$env:TEMP\deploy-windows.ps1"
```

**📖 [Complete Deployment Guide →](./DEPLOYMENT.md)**

---

## Features

- **Authentication & Authorization** - NextAuth.js v5 with role-based access control (Admin, Technician, Customer)
- **Customer CRM** - Comprehensive customer management with job history and analytics
- **Job Management** - Complete job tracking from creation to completion with status workflows
- **Invoicing System** - Professional invoice generation with PDF export and email delivery
- **Parts Inventory** - Track parts, manage stock levels, and monitor usage
- **Dashboard Analytics** - Real-time metrics, charts, and business insights
- **Customer Portal** - QR code-based job submission for customers
- **Email Notifications** - Automated notifications for job status changes and invoices
- **Mobile Responsive** - Fully responsive design for all devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **QR Codes**: qrcode.react

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Installation

1. **Clone the repository**
   ```bash
   cd C:\temp\CursorRepo\erepair
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**

   Make sure PostgreSQL is running on `localhost:5432` with:
   - Database name: `erepairdbmain01`
   - Username: `postgres`
   - Password: `ecu2onvu`

   The database connection is already configured in the `.env` file.

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

   Or create a migration:
   ```bash
   npm run db:migrate
   ```

5. **Seed the database** (optional but recommended)
   ```bash
   npm run db:seed
   ```

6. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

After seeding the database, you can log in with:

### Admin Account
- **Email**: `admin@erepairshop.com`
- **Password**: `Admin@123`

### Technician Account
- **Email**: `tech@erepairshop.com`
- **Password**: `Tech@123`

## Project Structure

```
erepair/
├── app/                        # Next.js app directory
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── jobs/             # Job management pages
│   │   ├── customers/        # Customer CRM pages
│   │   ├── invoices/         # Invoicing pages
│   │   ├── parts/            # Parts inventory pages
│   │   ├── calendar/         # Calendar & scheduling
│   │   ├── reports/          # Analytics & reports
│   │   └── settings/         # System settings
│   ├── auth/                 # Authentication pages
│   │   └── login/           # Login page
│   ├── portal/              # Customer portal (QR code access)
│   ├── api/                 # API routes
│   │   └── auth/            # NextAuth.js routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   └── layout/             # Layout components (Sidebar, Header)
├── lib/                    # Utility functions
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # Prisma client instance
│   └── utils.ts           # Helper functions
├── prisma/                 # Prisma schema and migrations
│   ├── schema.prisma      # Database schema (14 tables)
│   └── seed.ts            # Database seeding script
├── types/                  # TypeScript type definitions
│   └── next-auth.d.ts     # NextAuth type extensions
├── middleware.ts           # Auth middleware
├── Planning.md            # Project planning document
└── Task.md               # Task tracking document
```

## Database Schema

The application uses 14 main tables:

1. **User** - Authentication and user accounts
2. **Customer** - Customer CRM data
3. **Job** - Repair jobs with full details
4. **JobStatusHistory** - Job status timeline
5. **Part** - Parts inventory
6. **JobPart** - Parts used in jobs (junction table)
7. **Invoice** - Invoice headers
8. **InvoiceItem** - Invoice line items
9. **Payment** - Payment tracking
10. **EmailLog** - Email notification history
11. **Settings** - System configuration
12. **Notification** - In-app notifications
13. **Communication** - Customer communication log
14. **ActivityLog** - Audit trail

## Available Scripts

```bash
# Development
npm run dev              # Start development server

# Building
npm run build           # Build for production
npm start               # Start production server

# Code Quality
npm run lint            # Run ESLint

# Database
npm run db:generate     # Generate Prisma Client
npm run db:push         # Push schema changes to database
npm run db:migrate      # Create and run migrations
npm run db:studio       # Open Prisma Studio (database GUI)
npm run db:seed         # Seed database with initial data
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:ecu2onvu@localhost:5432/erepairdbmain01?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-change-in-production-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Email Configuration (configure in settings page)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM_EMAIL=""
SMTP_FROM_NAME=""
```

## User Roles & Permissions

### Admin
- Full access to all features
- User management
- System settings configuration
- View all analytics and reports
- Manage customers, jobs, invoices, and parts

### Technician
- View and update jobs
- Create invoices
- View customer data
- Add technician notes
- Upload photos
- Manage parts inventory

### Customer
- Submit jobs via QR code portal
- View own job status
- View own invoices
- Upload additional photos/documents

## Development Roadmap

### ✅ Phase 1: Foundation (COMPLETED)
- Project setup with Next.js 14 + TypeScript
- Database schema design (14 tables)
- NextAuth.js authentication
- Base layout and navigation
- Login page
- Dashboard page

### 🔄 Phase 2: Customer CRM (Next)
- Customer list with search/filters
- Customer detail pages
- Customer CRUD operations
- Job history view
- Export functionality

### 📋 Phase 3: Job Management
- Job list and filters
- Job creation form
- Job detail view with timeline
- Status updates
- Photo uploads
- Customer portal (QR code)

### 💰 Phase 4: Invoicing
- Invoice list and creation
- PDF generation
- Email delivery
- Payment tracking

### 📦 Phase 5: Parts Inventory
- Parts management
- Stock tracking
- Low stock alerts

### 📊 Phase 6: Analytics & Reporting
- Dashboard charts (Recharts)
- Business metrics
- Custom reports

### ⚙️ Phase 7: Settings & Configuration
- Email configuration
- User management
- Business settings

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # Windows
   services.msc  # Check if PostgreSQL service is running

   # Or check via command line
   psql -U default -d erepairdbmain01
   ```

2. Verify the database exists:
   ```sql
   CREATE DATABASE erepairdbmain01;
   ```

3. Check credentials in `.env` file

### Migration Errors

If migrations fail:

```bash
# Reset database (WARNING: This will delete all data)
npx prisma migrate reset

# Or use db push for development
npm run db:push
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting: `npm run lint`
4. Test your changes
5. Submit a pull request

## License

Private - All rights reserved

## Support

For issues or questions, please check:
- Planning.md for project overview
- Task.md for current development status
- Prisma schema for database structure

---

**Built with ❤️ using Next.js and TypeScript**
