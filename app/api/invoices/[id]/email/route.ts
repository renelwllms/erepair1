import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessInvoice } from "@/lib/access-control";
import { sendEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { normalizePaymentTerms } from "@/lib/payment-terms";
import { format } from "date-fns";
import { emailLayout, termsSummaryHtml } from "@/lib/email-templates";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// POST /api/invoices/[id]/email - Email invoice to customer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can email invoices
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await canAccessInvoice(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    // Fetch company settings
    const settings = await db.settings.findFirst();

    // Prepare invoice data for PDF generation
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      customer: {
        ...invoice.customer,
        address: invoice.customer.address || undefined,
        city: invoice.customer.city || undefined,
        state: invoice.customer.state || undefined,
        zipCode: invoice.customer.zipCode || undefined,
        userId: invoice.customer.userId || undefined,
      },
      job: invoice.job ? {
        ...invoice.job,
        modelNumber: invoice.job.modelNumber || undefined,
        serialNumber: invoice.job.serialNumber || undefined,
      } : invoice.job,
      invoiceItems: invoice.invoiceItems,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceAmount: invoice.balanceAmount,
      notes: invoice.notes || undefined,
      paymentTerms: normalizePaymentTerms(invoice.paymentTerms),
      termsAndConditions: settings?.termsAndConditions || undefined,
      companyName: settings?.companyName,
      companyEmail: settings?.companyEmail || undefined,
      companyPhone: settings?.companyPhone || undefined,
      companyAddress: settings?.companyAddress || undefined,
      companyLogo: settings?.companyLogo || undefined,
    };

    // Generate PDF
    const pdf = await generateInvoicePDF(invoiceData);
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const dueDateText = "Payment due upon collection of the device";
    const termsUrl = `${baseUrl}/terms-and-conditions`;
    const configuredTerms = settings?.termsAndConditions?.trim();
    const termsHtml = configuredTerms
      ? `
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin: 20px 0 0 0;">
          <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 14px;">Terms and Conditions</h3>
          <p style="color: #374151; font-size: 12px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${escapeHtml(configuredTerms)}</p>
        </div>
      `
      : termsSummaryHtml(termsUrl);

    const content = `
      <h2 style="color: #1f2937; margin: 0 0 20px 0;">
        Invoice
      </h2>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Dear ${invoice.customer.firstName} ${invoice.customer.lastName},
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Thank you for your business. Please find your invoice attached.
      </p>

      <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 0 0 30px 0;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
          Invoice Details
        </h3>
        <table width="100%" cellpadding="8" cellspacing="0">
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Invoice Number:</td>
            <td style="color: #1f2937; font-size: 14px; font-weight: bold; padding: 8px 0;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Job Number:</td>
            <td style="color: #1f2937; font-size: 14px; font-weight: bold; padding: 8px 0;">${invoice.job.jobNumber}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Issue Date:</td>
            <td style="color: #1f2937; font-size: 14px; padding: 8px 0;">${format(invoice.issueDate, "MMMM dd, yyyy")}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Due Date:</td>
            <td style="color: #1f2937; font-size: 14px; padding: 8px 0;">${dueDateText}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Appliance:</td>
            <td style="color: #1f2937; font-size: 14px; padding: 8px 0;">${invoice.job.applianceBrand} ${invoice.job.applianceType}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
        <table width="100%" cellpadding="6" cellspacing="0">
          <tr>
            <td style="color: #6b7280; font-size: 14px;">Subtotal:</td>
            <td style="color: #111827; font-size: 14px; font-weight: bold; text-align: right;">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px;">Tax (${invoice.taxRate}%):</td>
            <td style="color: #111827; font-size: 14px; font-weight: bold; text-align: right;">${formatCurrency(invoice.taxAmount)}</td>
          </tr>
          ${invoice.discountAmount > 0 ? `
          <tr>
            <td style="color: #6b7280; font-size: 14px;">Discount:</td>
            <td style="color: #10b981; font-size: 14px; font-weight: bold; text-align: right;">-${formatCurrency(invoice.discountAmount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: #1e40af; font-size: 16px; font-weight: bold; padding-top: 10px;">Total Amount:</td>
            <td style="color: #1e3a8a; font-size: 20px; font-weight: bold; text-align: right; padding-top: 10px;">${formatCurrency(invoice.totalAmount)}</td>
          </tr>
          ${invoice.paidAmount > 0 ? `
          <tr>
            <td style="color: #6b7280; font-size: 14px;">Paid:</td>
            <td style="color: #10b981; font-size: 14px; font-weight: bold; text-align: right;">${formatCurrency(invoice.paidAmount)}</td>
          </tr>
          ` : ''}
          ${invoice.balanceAmount > 0 ? `
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding-top: 6px;">Balance Due:</td>
            <td style="color: #ef4444; font-size: 16px; font-weight: bold; text-align: right; padding-top: 6px;">${formatCurrency(invoice.balanceAmount)}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${normalizePaymentTerms(invoice.paymentTerms) ? `
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;"><strong>Payment Terms:</strong><br>${normalizePaymentTerms(invoice.paymentTerms)}</p>
      ` : ''}

      ${invoice.notes ? `
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;"><strong>Notes:</strong><br>${invoice.notes}</p>
      ` : ''}

      ${termsHtml}

      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        The complete invoice is attached as a PDF document. If you have any questions, please contact us.
      </p>
    `;

    const emailHtml = emailLayout(content, settings?.companyName || "E-Repair Shop");

    // Send email with PDF attachment
    const emailResult = await sendEmail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${settings?.companyName || "E-Repair Shop"}`,
      html: emailHtml,
      emailType: "INVOICE",
      relatedId: invoice.id,
      sentById: session.user.id,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
          encoding: "base64",
          contentType: "application/pdf",
        },
      ],
    });

    // Log the email
    await db.emailLog.create({
      data: {
        sentById: session.user.id,
        recipient: invoice.customer.email,
        subject: `Invoice ${invoice.invoiceNumber}`,
        body: emailHtml,
        status: emailResult.success ? "SENT" : "FAILED",
        errorMsg: emailResult.success ? null : "Failed to send email",
        emailType: "INVOICE",
        relatedId: invoice.id,
      },
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Update invoice status to SENT if it was DRAFT
    if (invoice.status === "DRAFT") {
      await db.invoice.update({
        where: { id: params.id },
        data: { status: "SENT" },
      });
    }

    return NextResponse.json({
      message: "Invoice sent successfully",
      recipient: invoice.customer.email,
    });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    return NextResponse.json(
      { error: "Failed to send invoice email" },
      { status: 500 }
    );
  }
}
