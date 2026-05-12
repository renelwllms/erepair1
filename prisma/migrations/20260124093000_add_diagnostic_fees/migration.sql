-- Add diagnostic fee settings
ALTER TABLE "Settings" ADD COLUMN "diagnosticFees" TEXT;
ALTER TABLE "Settings" ADD COLUMN "diagnosticFeeDefaultOther" DOUBLE PRECISION;

-- Add diagnostic fee tracking to jobs
ALTER TABLE "Job" ADD COLUMN "diagnosticFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "diagnosticFeePaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "diagnosticFeePaidAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "diagnosticFeePaymentMethod" "PaymentMethod";
ALTER TABLE "Job" ADD COLUMN "diagnosticFeeAppliedToInvoice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "repairApproved" BOOLEAN NOT NULL DEFAULT false;
