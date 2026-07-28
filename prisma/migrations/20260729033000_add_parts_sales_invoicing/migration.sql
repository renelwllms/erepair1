-- Add internal inventory fields.
ALTER TABLE "Part" ADD COLUMN "sku" TEXT;
ALTER TABLE "Part" ADD COLUMN "location" TEXT;

-- Allow invoice line items to reference inventory parts.
ALTER TABLE "InvoiceItem" ADD COLUMN "partId" TEXT;

-- Allow parts-sale invoices that are not attached to a repair job.
ALTER TABLE "Invoice" ALTER COLUMN "jobId" DROP NOT NULL;

-- Indexes and constraints.
CREATE UNIQUE INDEX "Part_sku_key" ON "Part"("sku");
CREATE INDEX "Part_sku_idx" ON "Part"("sku");
CREATE INDEX "InvoiceItem_partId_idx" ON "InvoiceItem"("partId");

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_partId_fkey"
  FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
