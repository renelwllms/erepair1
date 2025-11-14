import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays } from "date-fns";

// POST /api/quotes/[id]/convert-to-invoice - Convert accepted quote to invoice
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get quote with all details
    const quote = await db.quote.findUnique({
      where: { id: params.id },
      include: {
        job: true,
        customer: true,
        quoteItems: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check if quote is accepted
    if (quote.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Only accepted quotes can be converted to invoices" },
        { status: 400 }
      );
    }

    // Check if already converted
    if (quote.convertedToInvoiceId) {
      return NextResponse.json(
        { error: "Quote has already been converted to an invoice" },
        { status: 400 }
      );
    }

    // Check if job already has an invoice
    const existingInvoice = await db.invoice.findUnique({
      where: { jobId: quote.jobId },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Job already has an invoice" },
        { status: 400 }
      );
    }

    // Get settings for invoice configuration
    const settings = await db.settings.findFirst();

    // Generate invoice number
    const lastInvoice = await db.invoice.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let invoiceCounter = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(
        lastInvoice.invoiceNumber.replace(settings?.invoiceNumberPrefix || "INV-", "")
      );
      if (!isNaN(lastNumber)) {
        invoiceCounter = lastNumber + 1;
      }
    }

    const invoiceNumber = `${settings?.invoiceNumberPrefix || "INV-"}${invoiceCounter
      .toString()
      .padStart(5, "0")}`;

    // Calculate due date (default 30 days from now)
    const dueDate = addDays(new Date(), 30);

    // Create invoice from quote
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        jobId: quote.jobId,
        customerId: quote.customerId,
        issuedById: session.user.id,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate,
        subtotal: quote.subtotal,
        taxRate: quote.taxRate,
        taxAmount: quote.taxAmount,
        discountAmount: quote.discountAmount,
        totalAmount: quote.totalAmount,
        paidAmount: 0,
        balanceAmount: quote.totalAmount,
        notes: quote.notes,
        paymentTerms: "Net 30",
        invoiceItems: {
          create: quote.quoteItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            itemType: item.itemType,
          })),
        },
      },
      include: {
        invoiceItems: true,
      },
    });

    // Update quote to mark as converted
    await db.quote.update({
      where: { id: params.id },
      data: {
        status: "CONVERTED_TO_INVOICE",
        convertedToInvoiceId: invoice.id,
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
        notes: `Quote ${quote.quoteNumber} converted to invoice ${invoiceNumber}`,
        changedBy: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: "Quote converted to invoice successfully",
    });
  } catch (error) {
    console.error("Error converting quote to invoice:", error);
    return NextResponse.json(
      { error: "Failed to convert quote to invoice" },
      { status: 500 }
    );
  }
}
