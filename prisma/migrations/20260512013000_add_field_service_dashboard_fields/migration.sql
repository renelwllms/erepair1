-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'NEW_CALLOUT';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'TECHNICIAN_ASSIGNED';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'TECHNICIAN_ON_THE_WAY';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'ARRIVED_ON_SITE';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'WORK_IN_PROGRESS';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_PARTS';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_CUSTOMER';
ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- AlterTable
ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "calloutLatitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "calloutLongitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT,
ADD COLUMN IF NOT EXISTS "distanceFromOfficeKm" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "estimatedTravelTime" TEXT,
ADD COLUMN IF NOT EXISTS "scheduledDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "scheduledTime" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "assignedBy" TEXT,
ADD COLUMN IF NOT EXISTS "assignmentNotes" TEXT,
ADD COLUMN IF NOT EXISTS "statusUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "customerNotificationSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "JobStatusHistory"
ADD COLUMN IF NOT EXISTS "previousStatus" TEXT,
ADD COLUMN IF NOT EXISTS "newStatus" TEXT,
ADD COLUMN IF NOT EXISTS "changedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings"
ADD COLUMN IF NOT EXISTS "officeAddress" TEXT,
ADD COLUMN IF NOT EXISTS "officeLatitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "officeLongitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE IF NOT EXISTS "JobNote" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "technicianId" TEXT,
  "noteType" TEXT NOT NULL,
  "noteText" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'Internal',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "JobPhoto" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "uploadedBy" TEXT,
  "photoCategory" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomerNotification" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "queuedUntil" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Job_jobType_idx" ON "Job"("jobType");
CREATE INDEX IF NOT EXISTS "Job_scheduledTime_idx" ON "Job"("scheduledTime");
CREATE INDEX IF NOT EXISTS "JobNote_jobId_idx" ON "JobNote"("jobId");
CREATE INDEX IF NOT EXISTS "JobNote_technicianId_idx" ON "JobNote"("technicianId");
CREATE INDEX IF NOT EXISTS "JobNote_createdAt_idx" ON "JobNote"("createdAt");
CREATE INDEX IF NOT EXISTS "JobPhoto_jobId_idx" ON "JobPhoto"("jobId");
CREATE INDEX IF NOT EXISTS "JobPhoto_uploadedBy_idx" ON "JobPhoto"("uploadedBy");
CREATE INDEX IF NOT EXISTS "JobPhoto_createdAt_idx" ON "JobPhoto"("createdAt");
CREATE INDEX IF NOT EXISTS "CustomerNotification_jobId_idx" ON "CustomerNotification"("jobId");
CREATE INDEX IF NOT EXISTS "CustomerNotification_status_idx" ON "CustomerNotification"("status");
CREATE INDEX IF NOT EXISTS "CustomerNotification_queuedUntil_idx" ON "CustomerNotification"("queuedUntil");
CREATE INDEX IF NOT EXISTS "CustomerNotification_createdAt_idx" ON "CustomerNotification"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerNotification" ADD CONSTRAINT "CustomerNotification_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
