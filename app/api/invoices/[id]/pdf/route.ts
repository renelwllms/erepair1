import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInvoicePDF } from "@/lib/pdf-generator";

// GET /api/invoices/[id]/pdf - Generate and download invoice PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invoice with all related data
    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        job: true,
        invoiceItems: {
          orderBy: { createdAt: "asc" },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Fetch company settings for PDF header
    const settings = await db.settings.findFirst();

    // Prepare invoice data for PDF generation
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      customer: invoice.customer,
      job: invoice.job,
      invoiceItems: invoice.invoiceItems,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceAmount: invoice.balanceAmount,
      notes: invoice.notes || undefined,
      paymentTerms: invoice.paymentTerms || undefined,
      companyName: settings?.companyName,
      companyEmail: settings?.companyEmail || undefined,
      companyPhone: settings?.companyPhone || undefined,
      companyAddress: settings?.companyAddress || undefined,
    };

    // Generate PDF
    const pdf = generateInvoicePDF(invoiceData);

    // Convert PDF to buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
