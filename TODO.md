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

### 14. Send Quote API Endpoint ✨ NEW
- Created `app/api/jobs/[id]/send-quote/route.ts`
- POST endpoint that:
  - Accepts quote items (description, quantity, unit price, total)
  - Calculates subtotal, tax, and total amount
  - Generates quote PDF using `quote-generator.ts`
  - Sends email with PDF attachment using QUOTE_SENT template
  - Updates job status to AWAITING_CUSTOMER_APPROVAL
  - Sets `quoteSentAt` timestamp
  - Creates job status history entry
  - Returns success response with quote number

### 15. Send Quote UI in Job Details Page ✨ NEW
- Added "Send Quote" button to job details page (`app/(dashboard)/jobs/[id]/page.tsx`)
- Created comprehensive quote dialog with:
  - Dynamic line items management (add/remove items)
  - Description, quantity, unit price fields per item
  - Real-time total calculations
  - Configurable tax rate
  - Optional notes field
  - Quote validity information (30 days default)
  - Form validation before sending
- Integrated with `/api/jobs/[id]/send-quote` endpoint
- Success notifications with quote number
- Auto-refreshes job data after sending

### 16. Job Notification Highlighting ✨ NEW
- Updated job list page (`app/(dashboard)/jobs/page.tsx`) with notification tracking:
  - Added `lastNotificationSent` field to Job interface
  - Fetches `notificationReminderDays` from settings (default: 3 days)
  - Helper function `needsAttention()` checks if job needs notification:
    - Returns true if no notification ever sent
    - Returns true if last notification older than reminder days
    - Returns false for closed/cancelled jobs
  - Visual indicators:
    - Yellow background (bg-yellow-50) for jobs needing attention
    - Bell icon next to job number for jobs needing notification
  - New "Needs Attention" filter showing count of jobs requiring notification
  - Client-side filtering to show only jobs needing attention

---

## Pending Features 🔄

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

1. **Testing & Verification** (High Priority) ✅ COMPLETED FEATURES READY FOR TESTING
   - ✅ Test quote generation and sending workflow
   - ✅ Test job notification highlighting and filtering
   - Test all automated email sending
   - Test status changes and notifications
   - Test camera photo capture on mobile devices
   - Test QR code scanning workflow

2. **Inline Job Editing** (Medium Priority)
   - Convert job details page to editable form
   - Remove need for separate edit page
   - Improve user experience

3. **Future Enhancements** (Low Priority)
   - Add bulk actions for jobs
   - Add job analytics and reporting
   - Add advanced search capabilities
   - Add customer notification preferences

---

## Notes

- All database migrations have been applied
- Default email templates have been seeded
- Email sending requires SMTP configuration in Settings
- Logo upload saves to `public/uploads/` directory
- Quote PDFs are generated on-the-fly (not stored)
- Customer photos are stored as base64 in database

---

Last Updated: 2025-11-04 (Session: Completed Send Quote feature and Job Notification Highlighting)
