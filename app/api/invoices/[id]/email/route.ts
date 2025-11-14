import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { format } from "date-fns";

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

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .invoice-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { font-weight: 600; }
          .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #4F46E5; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .total-amount { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .balance-due { font-size: 20px; font-weight: bold; color: #EF4444; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice from ${settings?.companyName || "E-Repair Shop"}</h1>
          </div>
          <div class="content">
            <p>Dear ${invoice.customer.firstName} ${invoice.customer.lastName},</p>

            <p>Thank you for your business. Please find attached your invoice for the recent repair service.</p>

            <div class="invoice-details">
              <h2 style="margin-top: 0; color: #4F46E5;">Invoice Details</h2>
              <div class="detail-row">
                <span class="label">Invoice Number:</span>
                <span class="value">${invoice.invoiceNumber}</span>
              </div>
              <div class="detail-row">
                <span class="label">Job Number:</span>
                <span class="value">${invoice.job.jobNumber}</span>
              </div>
              <div class="detail-row">
                <span class="label">Issue Date:</span>
                <span class="value">${format(invoice.issueDate, "MMMM dd, yyyy")}</span>
              </div>
              <div class="detail-row">
                <span class="label">Due Date:</span>
                <span class="value">${format(invoice.dueDate, "MMMM dd, yyyy")}</span>
              </div>
              <div class="detail-row">
                <span class="label">Appliance:</span>
                <span class="value">${invoice.job.applianceBrand} ${invoice.job.applianceType}</span>
              </div>

              <div class="total-section">
                <div class="total-row">
                  <span class="label">Subtotal:</span>
                  <span class="value">${formatCurrency(invoice.subtotal)}</span>
                </div>
                <div class="total-row">
                  <span class="label">Tax (${invoice.taxRate}%):</span>
                  <span class="value">${formatCurrency(invoice.taxAmount)}</span>
                </div>
                ${invoice.discountAmount > 0 ? `
                <div class="total-row">
                  <span class="label">Discount:</span>
                  <span class="value" style="color: #10b981;">-${formatCurrency(invoice.discountAmount)}</span>
                </div>
                ` : ''}
                <div class="total-row" style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
                  <span style="font-size: 18px; font-weight: 600;">Total Amount:</span>
                  <span class="total-amount">${formatCurrency(invoice.totalAmount)}</span>
                </div>
                ${invoice.paidAmount > 0 ? `
                <div class="total-row">
                  <span class="label">Paid:</span>
                  <span class="value" style="color: #10b981;">${formatCurrency(invoice.paidAmount)}</span>
                </div>
                ` : ''}
                ${invoice.balanceAmount > 0 ? `
                <div class="total-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 16px; font-weight: 600;">Balance Due:</span>
                  <span class="balance-due">${formatCurrency(invoice.balanceAmount)}</span>
                </div>
                ` : ''}
              </div>
            </div>

            ${invoice.paymentTerms ? `
            <p><strong>Payment Terms:</strong><br>${invoice.paymentTerms}</p>
            ` : ''}

            ${invoice.notes ? `
            <p><strong>Notes:</strong><br>${invoice.notes}</p>
            ` : ''}

            <p>The complete invoice is attached as a PDF document. If you have any questions about this invoice, please don't hesitate to contact us.</p>

            <p>Thank you for choosing ${settings?.companyName || "E-Repair Shop"}!</p>
          </div>

          <div class="footer">
            <p>
              ${settings?.companyName || "E-Repair Shop"}<br>
              ${settings?.companyEmail ? `Email: ${settings.companyEmail}<br>` : ''}
              ${settings?.companyPhone ? `Phone: ${settings.companyPhone}<br>` : ''}
              ${settings?.companyAddress ? settings.companyAddress : ''}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

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
        errorMsg: emailResult.error || null,
        emailType: "INVOICE",
        relatedId: invoice.id,
      },
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send email" },
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
