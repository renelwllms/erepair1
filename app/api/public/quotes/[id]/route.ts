import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/quotes/[id] - Public quote details for accept/reject pages
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await db.quote.findUnique({
      where: { id: params.id },
      include: {
        job: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      discountAmount: quote.discountAmount,
      totalAmount: quote.totalAmount,
      job: {
        jobNumber: quote.job.jobNumber,
        applianceType: quote.job.applianceType,
        applianceBrand: quote.job.applianceBrand,
        modelNumber: quote.job.modelNumber,
        issueDescription: quote.job.issueDescription,
        diagnosticFeeAmount: quote.job.diagnosticFeeAmount,
      },
    });
  } catch (error) {
    console.error("Error fetching public quote:", error);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}
