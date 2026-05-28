import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessQuote } from "@/lib/access-control";
import { buildDiagnosticCreditItem } from "@/lib/diagnostic-fees";
import { addDays } from "date-fns";

async function resolveActiveStaffUser(session: any) {
  return (
    (await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isActive: true },
    })) ||
    (session.user.email
      ? await db.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, isActive: true },
        })
      : null)
  );
}

// POST /api/quotes/[id]/convert-to-invoice - Convert accepted quote to invoice
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbAny = db as any;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actor = await resolveActiveStaffUser(session);
    if (!actor || !actor.isActive) {
      return NextResponse.json(
        { error: "Your login session is out of sync with the user record. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    if (!(await canAccessQuote(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get quote with all details
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
    const existingInvoice = await dbAny.invoice.findUnique({
      where: { jobId: quote.jobId },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Job already has an invoice" },
        { status: 400 }
      );
    }

    // Get settings for invoice configuration
    const settings = await dbAny.settings.findFirst();

    // Generate invoice number
    const lastInvoice = await dbAny.invoice.findFirst({
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
        itemType: item.itemType,
      })),
      ...(shouldApplyDiagnosticFee ? [buildDiagnosticCreditItem(jobWithDiagnostics.diagnosticFeeAmount)] : []),
    ];

    const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = quote.taxRate;
    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = quote.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create invoice from quote
    const invoice = await dbAny.invoice.create({
      data: {
        invoiceNumber,
        jobId: quote.jobId,
        customerId: quote.customerId,
        issuedById: actor.id,
        status: "DRAFT",
        issueDate: new Date(),
        dueDate,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        notes: quote.notes,
        paymentTerms: "Payment due upon collection of the device",
        invoiceItems: {
          create: invoiceItems.map((item) => ({
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
    await dbAny.quote.update({
      where: { id: params.id },
      data: {
        status: "CONVERTED_TO_INVOICE",
        convertedToInvoiceId: invoice.id,
      },
    });

    // Update job status
    await dbAny.job.update({
      where: { id: quote.jobId },
      data: {
        status: "IN_PROGRESS",
        repairApproved: true,
        diagnosticFeeAppliedToInvoice: shouldApplyDiagnosticFee || jobWithDiagnostics.diagnosticFeeAppliedToInvoice,
      },
    });

    // Create status history entry
    await dbAny.jobStatusHistory.create({
      data: {
        jobId: quote.jobId,
        status: "IN_PROGRESS",
        notes: `Quote ${quote.quoteNumber} converted to invoice ${invoiceNumber}`,
        changedBy: actor.id,
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
