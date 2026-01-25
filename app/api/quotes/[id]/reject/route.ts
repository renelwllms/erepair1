import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const rejectQuoteSchema = z.object({
  reason: z.string().optional(),
});

// POST /api/quotes/[id]/reject - Reject a quote (public endpoint)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbAny = db as any;
    const body = await request.json();
    const validatedData = rejectQuoteSchema.parse(body);

    // Get quote with job and customer details
    const quote = await dbAny.quote.findUnique({
      where: { id: params.id },
      include: {
        job: true,
        customer: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check if quote has already been responded to
    if (quote.customerResponse) {
      return NextResponse.json(
        { error: `Quote has already been ${quote.customerResponse.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update quote status to REJECTED
    const updatedQuote = await dbAny.quote.update({
      where: { id: params.id },
      data: {
        status: "REJECTED",
        customerResponse: "REJECTED",
        customerResponseDate: new Date(),
        rejectionReason: validatedData.reason,
      },
    });

    // Update job status back to OPEN
    await dbAny.job.update({
      where: { id: quote.jobId },
      data: {
        status: "OPEN",
        repairApproved: false,
      },
    });

    // Create status history entry
    await dbAny.jobStatusHistory.create({
      data: {
        jobId: quote.jobId,
        status: "OPEN",
        notes: `Quote ${quote.quoteNumber} rejected by customer${
          validatedData.reason ? `: ${validatedData.reason}` : ""
        }`,
      },
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message: "Quote rejected successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error rejecting quote:", error);
    return NextResponse.json({ error: "Failed to reject quote" }, { status: 500 });
  }
}
