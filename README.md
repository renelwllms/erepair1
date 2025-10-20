# Erepair – Appliance Repair Shop Platform

Full-stack management console for appliance repair shops. This codebase implements the foundation described in `repair_shop_app_spec (1).md`: authentication, CRM scaffolding, job tracking, invoicing, and system configuration.

## Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS, shadcn-style UI kit, Radix primitives, lucide-react icons
- **Data:** PostgreSQL (Prisma ORM)
- **Auth:** NextAuth.js (credentials provider + Prisma adapter)
- **State:** React Query, React Hook Form, Zod validation
- **Email:** Nodemailer (SMTP transport helper)

## Project layout
```
Erepair/
├─ PROJECT_PLAN.md          ← implementation roadmap mapped to the spec
└─ web/                     ← Next.js application
   ├─ prisma/schema.prisma  ← database schema (users, customers, jobs, invoices, etc.)
   ├─ prisma/seed.ts        ← seeds an initial admin user
   ├─ src/app               ← App/route groups (marketing, auth, dashboard)
   ├─ src/components        ← UI kit, layout shell, dashboard widgets, auth form
   ├─ src/server            ← Prisma client + NextAuth configuration + email helper
   └─ .env.example          ← required environment variables
```

## Prerequisites
- Node.js 18+ (Node 22 LTS recommended)
- PostgreSQL instance (local Docker or hosted)

## Setup
1. Install dependencies
   ```bash
   cd Erepair/web
   npm install
   ```
2. Copy the environment template and update values
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: new `openssl rand -hex 32`
   - `NEXTAUTH_URL`: usually `http://localhost:3000` in development
   - SMTP keys are optional until email is configured
   - `INIT_ADMIN_EMAIL` / `INIT_ADMIN_PASSWORD`: credentials for seeding the first admin
3. Generate Prisma client & run migrations (adjust migration name as needed)
   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   ```
4. Seed an initial admin account
   ```bash
   npm run db:seed
   ```
5. Start the development server (defaults to port 3000)
   ```bash
   npm run dev
   ```
6. Sign in with the seeded admin credentials and change the password from the UI once user management is implemented.

## Available scripts
| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Create production build |
| `npm run start` | Run production server |
| `npm run lint` / `npm run lint:fix` | ESLint (flat config) |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Apply Prisma migrations (interactive) |
| `npm run db:push` | Push schema changes without migrations (dev only) |
| `npm run db:seed` | Seed default admin user using values from environment |

## Implemented foundation
- Responsive marketing landing page with CTA
- Auth route group with credential-based sign-in form (NextAuth + Prisma adapter + bcrypt)
- Protected dashboard shell (middleware + server layout redirect)
- Navigation: dashboard, customers, jobs, invoices, settings
- Placeholder dashboard widgets, CRM/job/invoice tables, and settings forms matching the spec roadmap
- Tailwind theme tokens & shadcn-style UI primitives (buttons, cards, badges, inputs, etc.)
- Prisma schema covering users/roles, customers, jobs, status history, parts, invoices, payments, notifications, portal tokens, and settings
- Nodemailer helper ready for SMTP integration

## Recommended next steps
1. Implement actual Prisma queries for the placeholder pages using server actions or route handlers.
2. Build customer + job forms with validation, file uploads, and role-based permissions.
3. Wire up email notifications via Nodemailer and log events in the `EmailLog` table.
4. Add PDF generation and payment tracking for invoices.
5. Expand settings to manage technicians, tax rates, and notification preferences.
6. Introduce automated tests (Playwright for e2e, Vitest for units) as features harden.

## Testing & quality
- ESLint with Next.js rules is configured; add Prettier if preferred.
- Consider adding CI to run `npm run lint`, `npm run db:generate`, and eventual unit/e2e suites.

## Notes
- The application uses the new Tailwind v4 syntax (`@theme inline`). If you prefer Tailwind v3, lock the dependency to `^3.4` and restore a `tailwind.config.js` file.
- Protect the seeded admin credentials and rotate them after deployment.
- For production, configure a persistent Prisma migration workflow and enable HTTPS (Vercel, Fly.io, or custom hosting).

