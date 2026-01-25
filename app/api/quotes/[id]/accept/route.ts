import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildDiagnosticCreditItem } from "@/lib/diagnostic-fees";

// POST /api/quotes/[id]/accept - Accept a quote (public endpoint)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbAny = db as any;
    // Get quote with job, customer, and items details
    const quote = await dbAny.quote.findUnique({
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
    const updatedQuote = await dbAny.quote.update({
      where: { id: params.id },
      data: {
        status: "ACCEPTED",
        customerResponse: "ACCEPTED",
        customerResponseDate: new Date(),
      },
    });

    // Update job status
    await dbAny.job.update({
      where: { id: quote.jobId },
      data: {
        status: "IN_PROGRESS",
      },
    });

    // Create status history entry
    await dbAny.jobStatusHistory.create({
      data: {
        jobId: quote.jobId,
        status: "IN_PROGRESS",
        notes: `Quote ${quote.quoteNumber} accepted by customer`,
      },
    });

    // Check if job already has an invoice (avoid duplicates)
    const existingInvoice = await dbAny.invoice.findUnique({
      where: { jobId: quote.jobId },
    });

    if (existingInvoice) {
      const convertedQuote = await dbAny.quote.update({
        where: { id: params.id },
        data: {
          status: "CONVERTED_TO_INVOICE",
          convertedToInvoiceId: existingInvoice.id,
          customerResponse: "ACCEPTED",
          customerResponseDate: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        quote: convertedQuote,
        invoice: existingInvoice,
        message: "Quote accepted successfully and invoice already exists",
      });
    }

    // Generate invoice number
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    const lastInvoice = await dbAny.invoice.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-").pop() || "0");
      nextNumber = lastNumber + 1;
    }

    const invoiceNumber = `INV-${year}${month}-${String(nextNumber).padStart(4, "0")}`;

    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Get the user who issued the quote to use as the invoice issuer
    const issuedById = quote.issuedById;

    const jobWithDiagnostics = quote.job as any;
    const shouldApplyDiagnosticFee =
      jobWithDiagnostics.diagnosticFeeAmount > 0 &&
      jobWithDiagnostics.diagnosticFeePaid &&
      !jobWithDiagnostics.diagnosticFeeAppliedToInvoice;

    const invoiceItems = [
      ...quote.quoteItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        itemType: "SERVICE_FEE",
      })),
      ...(shouldApplyDiagnosticFee ? [buildDiagnosticCreditItem(jobWithDiagnostics.diagnosticFeeAmount)] : []),
    ];

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = quote.taxRate;
    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = quote.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create invoice from quote with DRAFT status
    const invoice = await dbAny.invoice.create({
      data: {
        invoiceNumber,
        jobId: quote.jobId,
        customerId: quote.customerId,
        issuedById,
        status: "DRAFT",
        totalAmount,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        dueDate,
        notes: quote.notes,
        paymentTerms: "Payment due upon collection of the device",
      },
    });

    // Mark quote as converted and link invoice
    const convertedQuote = await dbAny.quote.update({
      where: { id: params.id },
      data: {
        status: "CONVERTED_TO_INVOICE",
        convertedToInvoiceId: invoice.id,
      },
    });

    // Create invoice items
    await dbAny.invoiceItem.createMany({
      data: invoiceItems.map((item) => ({
        invoiceId: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        itemType: item.itemType,
      })),
    });

    if (shouldApplyDiagnosticFee) {
      await dbAny.job.update({
        where: { id: quote.jobId },
        data: {
          diagnosticFeeAppliedToInvoice: true,
          repairApproved: true,
        },
      });
    } else {
      await dbAny.job.update({
        where: { id: quote.jobId },
        data: {
          repairApproved: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      quote: convertedQuote,
      invoice,
      message: "Quote accepted successfully and invoice created",
    });
  } catch (error) {
    console.error("Error accepting quote:", error);
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
