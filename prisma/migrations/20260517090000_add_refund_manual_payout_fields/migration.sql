CREATE TYPE "RefundPayoutStatus" AS ENUM ('PENDING', 'COMPLETED');

ALTER TABLE "Refund"
ADD COLUMN "referenceNumber" TEXT,
ADD COLUMN "payoutStatus" "RefundPayoutStatus" NOT NULL DEFAULT 'COMPLETED';
