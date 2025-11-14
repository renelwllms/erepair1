import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/quotes/[id]/accept - Accept a quote (public endpoint)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get quote with job and customer details
    const quote = await db.quote.findUnique({
      where: { id: params.id },
      include: {
        job: true,
        customer: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check if quote is still valid
    if (quote.validUntil < new Date()) {
      return NextResponse.json({ error: "Quote has expired" }, { status: 400 });
    }

    // Check if quote has already been responded to
    if (quote.customerResponse) {
      return NextResponse.json(
        { error: `Quote has already been ${quote.customerResponse.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update quote status to ACCEPTED
    const updatedQuote = await db.quote.update({
      where: { id: params.id },
      data: {
        status: "ACCEPTED",
        customerResponse: "ACCEPTED",
        customerResponseDate: new Date(),
      },
    });

    // Update job status
    await db.job.update({
      where: { id: quote.jobId },
      data: {
        status: "IN_PROGRESS",
      },
    });

    // Create status history entry
    await db.jobStatusHistory.create({
      data: {
        jobId: quote.jobId,
        status: "IN_PROGRESS",
        notes: `Quote ${quote.quoteNumber} accepted by customer`,
      },
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message: "Quote accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting quote:", error);
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
