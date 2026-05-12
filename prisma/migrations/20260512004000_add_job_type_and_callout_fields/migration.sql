-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('WORKSHOP_REPAIR', 'CALLOUT_REPAIR');

-- AlterTable
ALTER TABLE "Job"
ADD COLUMN "jobType" "JobType" NOT NULL DEFAULT 'WORKSHOP_REPAIR',
ADD COLUMN "calloutAccessInstructions" TEXT,
ADD COLUMN "calloutParkingNotes" TEXT,
ADD COLUMN "calloutApplianceLocation" TEXT;
