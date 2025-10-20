# Erepair Appliance Repair Shop Management

This document captures the initial implementation plan for the full-stack application described in `repair_shop_app_spec (1).md`.

## Stack Summary
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui component library
- Prisma ORM with PostgreSQL
- NextAuth.js (credentials + OAuth ready)
- nodemailer for SMTP email sending
- Zod for validation
- TanStack Query for client data fetching
- Upload handling via Next.js Route Handlers (local disk placeholder)

## High-Level Architecture
- `apps/web` (Next.js app)
- `packages/ui` (shadcn/ui component exports + theme)
- `packages/config` (shared Tailwind, ESLint, tsconfig)
- `packages/db` (Prisma schema + migrations)

## Phase 1 (Foundation)
1. Scaffold monorepo with Turborepo to manage multiple packages.
2. Setup Next.js app with Tailwind and shadcn/ui base styles.
3. Configure Prisma with PostgreSQL connection via `.env`.
4. Define initial database schema for users, roles, sessions, customers, jobs, status history, parts, invoices, payments, settings.
5. Generate Prisma client and push migration.
6. Implement NextAuth with Prisma adapter and role-based guard helpers.
7. Build base layout, navigation, and placeholder pages for Dashboard, Customers, Jobs, Invoices, Settings.
8. Add reusable UI primitives (button, input, table, badge, card).

## Phase 2 (Core Features)
- CRM pages with list/detail, create modal, search/filter.
- Job CRUD with status transitions and timeline view.
- Technician assignments and notes.
- Basic dashboard metrics.

## Phase 3 (Customer Portal)
- Public QR submission form.
- Email notifications.
- Customer job status page with JWT token for access.

## Phase 4 (Invoicing)
- Invoice builder with parts + labor + tax.
- PDF generation and email delivery.

## Phase 5 (Advanced)
- Analytics, inventory, reporting, settings.

## Immediate Next Steps
1. Run `npx create-next-app` with Turborepo preset or manual structure.
2. Install required dependencies (NextAuth, Prisma, Tailwind, shadcn/ui, Zod, TanStack Query, etc.).
3. Bootstrap configuration files and scripts.

