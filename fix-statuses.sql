-- First, we need to temporarily add the old values back to the enum
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';

-- Update the jobs
UPDATE "Job" SET status = 'CUSTOMER_CANCELLED' WHERE status = 'CANCELLED';
UPDATE "Job" SET status = 'AWAITING_CUSTOMER_APPROVAL' WHERE status = 'READY_FOR_PICKUP';

-- Note: PostgreSQL doesn't allow removing enum values easily
-- But that's okay, they just won't be used
