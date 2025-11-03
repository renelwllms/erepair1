# eRepair System - Development Progress

## Completed Features ✅

### 1. Job Edit Page Fixed
- Created `/app/(dashboard)/jobs/[id]/edit/page.tsx`
- Job editing now works properly from job list and details pages

### 2. Status Dropdown in Job List with Auto-Invoice
- Added inline status dropdown in job list
- When status is changed to "CLOSED", automatically redirects to invoice creation

### 3. Invoice PDF with Terms & Conditions
- Updated `lib/pdf-generator.ts` to include terms and conditions
- Terms display at bottom of invoice with proper formatting
- Supports multi-page terms if needed

### 4. Logo Upload in Settings
- Created `/app/api/settings/upload-logo/route.ts`
- Added logo upload UI in Settings page with preview
- Supports PNG, JPG, GIF, WebP (max 5MB)

### 5. Terms & Conditions Editor
- Added "Invoice & Terms" tab in Settings
- Large textarea for editing terms
- Stored in database and included in invoices

### 6. QR Code for Customer Portal
- Added "Customer Portal" tab in Settings
- Displays printable QR code
- Links to job submission form

### 7. Phone Number Search & Auto-Customer Creation
- Created `/app/api/public/search-customer/route.ts`
- Updates `/app/api/public/submit-job/route.ts` to search by phone first
- Pre-fills customer info if found
- Auto-creates new customer if not found

### 8. Camera-Only Photo Capture
- Implemented full-screen camera capture in submit-job form
- No gallery upload allowed - camera only
- Stores photo as base64 in `beforePhotos` field

### 9. Email Template System
- Created `EmailTemplate` model in database
- Created API endpoints:
  - `GET /api/email-templates` - List all templates
  - `POST /api/email-templates` - Create template
  - `GET /api/email-templates/[id]` - Get single template
  - `PUT /api/email-templates/[id]` - Update template
  - `DELETE /api/email-templates/[id]` - Delete template
- Seeded 7 default email templates:
  - JOB_OPEN
  - JOB_IN_PROGRESS
  - QUOTE_SENT
  - AWAITING_PARTS
  - READY_FOR_PICKUP
  - JOB_CLOSED
  - CUSTOMER_CANCELLED

### 10. Automated Emails on Status Change
- Created `/app/api/jobs/[id]/status/route.ts`
- Automatically sends email when job status changes
- Uses email templates with variable replacement
- Updates `lastNotificationSent` timestamp
- Creates status history entry

### 11. Email Template Management UI
- Added "Email Templates" tab in Settings page
- List all templates with edit/delete options
- Form to create/edit templates with subject and body
- Active/inactive toggle for templates
- Variable helper showing available variables

### 12. Database Schema Updates
- Added `termsAndConditions` to Settings
- Added `companyLogo` to Settings
- Added `notificationReminderDays` to Settings (default: 3 days)
- Added `lastNotificationSent` to Job model
- Added `quoteSentAt` to Job model
- Created `EmailTemplate` model
- Added new job statuses: READY_FOR_PICKUP, CANCELLED

### 13. Quote PDF Generator
- Created `lib/quote-generator.ts`
- Generates professional quote PDFs
- Includes device info, diagnostic results, line items, totals
- Includes terms and conditions

---

## Pending Features 🔄

### 1. Send Quote API Endpoint
**Status:** Needs manual file creation (bash command failed)

**What needs to be done:**
- Create file: `app/api/jobs/[id]/send-quote/route.ts`
- Implement POST endpoint that:
  - Accepts quote items and totals
  - Generates quote PDF using `quote-generator.ts`
  - Sends email with PDF attachment using QUOTE_SENT template
  - Updates job status to AWAITING_CUSTOMER_APPROVAL
  - Sets quoteSentAt timestamp
  - Returns success response

**Code location:** The code was prepared but bash command failed. See previous session for the complete code.

### 2. Send Quote Button in Job Details Page
**Status:** Not started

**What needs to be done:**
- Add "Send Quote" button to job details page (`app/(dashboard)/jobs/[id]/page.tsx`)
- Create dialog/modal for entering quote details:
  - Add line items (description, quantity, unit price)
  - Calculate subtotal, tax, total automatically
  - Add notes field
  - Set valid days (default: 30)
- Call `/api/jobs/[id]/send-quote` endpoint
- Show success message
- Refresh job data to show new status

### 3. Job Highlighting for Missing Notifications
**Status:** Not started

**What needs to be done:**
- Update job list (`app/(dashboard)/jobs/page.tsx`)
- Check `lastNotificationSent` field for each job
- Compare with `notificationReminderDays` setting (default: 3 days)
- Apply yellow/warning background to jobs that haven't been notified in X days
- Add filter option to show only "needs attention" jobs
- Show badge/icon indicating notification needed

**Example code:**
```typescript
const needsAttention = (job) => {
  if (!job.lastNotificationSent) return true;
  const daysSince = differenceInDays(new Date(), new Date(job.lastNotificationSent));
  return daysSince > notificationReminderDays;
};

// In TableRow:
<TableRow className={needsAttention(job) ? "bg-yellow-50" : ""}>
```

### 4. Convert Job Details to Inline Editable
**Status:** Not started

**What needs to be done:**
- Remake `/app/(dashboard)/jobs/[id]/page.tsx` to be editable directly
- Convert display fields to inline edit fields:
  - Use click-to-edit pattern OR
  - Show all fields as form inputs with save button
- Remove need for separate `/edit` route
- Use PUT `/api/jobs/[id]` endpoint for saving
- Show success toast after save
- Consider removing the edit page entirely

**Suggested approach:**
- Add "Edit Mode" toggle button
- In view mode: Show formatted data
- In edit mode: Show form inputs
- Save button appears in edit mode
- Cancel button reverts changes

---

## Database Schema Reference

### Job Model - New Fields
```prisma
model Job {
  // ... existing fields ...
  lastNotificationSent  DateTime?
  quoteSentAt           DateTime?

  @@index([lastNotificationSent])
}
```

### Settings Model - New Fields
```prisma
model Settings {
  // ... existing fields ...
  notificationReminderDays  Int      @default(3)
  termsAndConditions        String?  @db.Text
  companyLogo               String?
}
```

### EmailTemplate Model
```prisma
model EmailTemplate {
  id            String   @id @default(cuid())
  name          String   @unique
  subject       String
  body          String   @db.Text
  description   String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([name])
  @@index([isActive])
}
```

---

## API Endpoints Reference

### Email Templates
- `GET /api/email-templates` - List all templates
- `POST /api/email-templates` - Create new template
- `GET /api/email-templates/[id]` - Get single template
- `PUT /api/email-templates/[id]` - Update template
- `DELETE /api/email-templates/[id]` - Delete template

### Job Status
- `PUT /api/jobs/[id]/status` - Update job status (sends automated email)

### Quote (Pending)
- `POST /api/jobs/[id]/send-quote` - Generate and send quote (needs creation)

### Customer Search (Public)
- `GET /api/public/search-customer?phone=XXX` - Search customer by phone

### Settings
- `POST /api/settings/upload-logo` - Upload company logo

---

## Template Variables

Available variables for email templates:
- `{{customerName}}` - Full customer name
- `{{jobNumber}}` - Job number (e.g., JOB-00001)
- `{{applianceBrand}}` - Device brand
- `{{applianceType}}` - Device type
- `{{issueDescription}}` - Problem description
- `{{companyName}}` - Your company name
- `{{quotedAmount}}` - Quote total (for QUOTE_SENT template)

---

## Next Steps

1. **Complete Send Quote Feature** (High Priority)
   - Manually create the send-quote API endpoint
   - Add UI for sending quotes from job details page
   - Test end-to-end quote workflow

2. **Add Job Highlighting** (Medium Priority)
   - Implement notification reminder logic
   - Add visual indicators for jobs needing attention
   - Add filter for "needs attention" jobs

3. **Inline Job Editing** (Medium Priority)
   - Convert job details page to editable form
   - Remove need for separate edit page
   - Improve user experience

4. **Testing** (High Priority)
   - Test all automated email sending
   - Test status changes and notifications
   - Test quote generation and sending
   - Test camera photo capture on mobile devices
   - Test QR code scanning workflow

---

## Notes

- All database migrations have been applied
- Default email templates have been seeded
- Email sending requires SMTP configuration in Settings
- Logo upload saves to `public/uploads/` directory
- Quote PDFs are generated on-the-fly (not stored)
- Customer photos are stored as base64 in database

---

Last Updated: 2025-01-03
