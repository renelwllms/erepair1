import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { generateQuotePDF } from "@/lib/quote-generator";
import { emailLayout, quoteSentEmail } from "@/lib/email-templates";

export const dynamic = 'force-dynamic';

// POST /api/quotes/[id]/resend - Resend quote to customer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can resend quotes
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get quote with all details
    const quote = await db.quote.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        job: true,
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

    // Only resend SENT quotes
    if (quote.status !== "SENT") {
      return NextResponse.json(
        { error: "Can only resend quotes that have been sent" },
        { status: 400 }
      );
    }

    // Get settings for company info
    const settings = await db.settings.findFirst();

    // Prepare quote data for PDF
    const quoteData = {
      quoteNumber: quote.quoteNumber,
      issueDate: quote.issueDate.toISOString(),
      validUntil: quote.validUntil.toISOString(),
      customer: {
        firstName: quote.customer.firstName,
        lastName: quote.customer.lastName,
        email: quote.customer.email,
        phone: quote.customer.phone,
        address: quote.customer.address || undefined,
        city: quote.customer.city || undefined,
        state: quote.customer.state || undefined,
        zipCode: quote.customer.zipCode || undefined,
      },
      job: {
        jobNumber: quote.job.jobNumber,
        applianceType: quote.job.applianceType,
        applianceBrand: quote.job.applianceBrand,
        modelNumber: quote.job.modelNumber || undefined,
        issueDescription: quote.job.issueDescription,
        diagnosticResults: quote.job.diagnosticResults || undefined,
      },
      quoteItems: quote.quoteItems,
      subtotal: quote.subtotal,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
      diagnosticFeeAmount:
        typeof quote.job.diagnosticFeeAmount === "number" ? quote.job.diagnosticFeeAmount : undefined,
      notes: quote.notes || undefined,
      termsAndConditions: settings?.termsAndConditions || undefined,
      companyName: settings?.companyName || "E-Repair Shop",
      companyEmail: settings?.companyEmail || undefined,
      companyPhone: settings?.companyPhone || undefined,
      companyAddress: settings?.companyAddress || undefined,
      companyLogo: settings?.companyLogo || undefined,
    };

    // Generate PDF
    const pdfDoc = await generateQuotePDF(quoteData);
    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
    const pdfBase64 = pdfBuffer.toString("base64");

    // Send email with quote PDF
    let template = await db.emailTemplate.findUnique({
      where: { name: "QUOTE_SENT" },
    });
    if (!template) {
      template = await db.emailTemplate.findUnique({
        where: { name: "quote_sent" },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/quote/accept/${quote.id}`;
    const rejectUrl = `${baseUrl}/quote/reject/${quote.id}`;

    const diagnosticFeeAmount =
      typeof quote.job.diagnosticFeeAmount === "number" ? quote.job.diagnosticFeeAmount : null;
    const diagnosticFeeNotice =
      typeof diagnosticFeeAmount === "number" && diagnosticFeeAmount > 0
        ? `Diagnostic fee of ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(diagnosticFeeAmount)} is non-refundable if you decide not to proceed. If you approve the repair, this fee will be credited toward your final invoice.`
        : null;

    const replaceVariables = (text: string) => {
      return text
        .replace(/{{customerName}}/g, `${quote.customer.firstName} ${quote.customer.lastName}`)
        .replace(/{{jobNumber}}/g, quote.job.jobNumber)
        .replace(/{{applianceBrand}}/g, quote.job.applianceBrand)
        .replace(/{{applianceType}}/g, quote.job.applianceType)
        .replace(/{{issueDescription}}/g, quote.job.issueDescription)
        .replace(/{{companyName}}/g, settings?.companyName || "E-Repair Shop")
        .replace(/{{quotedAmount}}/g, new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(quote.totalAmount))
        .replace(/{{acceptUrl}}/g, acceptUrl)
        .replace(/{{rejectUrl}}/g, rejectUrl)
        .replace(
          /{{diagnosticFeeAmount}}/g,
          typeof diagnosticFeeAmount === "number"
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(diagnosticFeeAmount)
            : ""
        )
        .replace(/{{diagnosticFeeNotice}}/g, diagnosticFeeNotice || "");
    };

    let subject: string | null = null;
    let body: string | null = null;
    let text: string | null = null;

    const extractBody = (html: string) => {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch ? bodyMatch[1] : html;
    };

    if (template && template.isActive) {
      subject = replaceVariables(template.subject);
      body = replaceVariables(template.body);

      const templateHasLinks =
        template.body.includes("{{acceptUrl}}") ||
        template.body.includes("{{rejectUrl}}") ||
        template.body.includes("acceptUrl") ||
        template.body.includes("rejectUrl");

      // Add accept/reject buttons if not in template
      if (!templateHasLinks) {
        body += `
          <div style="margin: 30px 0; text-align: center;">
            <a href="${acceptUrl}" style="display: inline-block; padding: 12px 30px; margin: 0 10px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Accept Quote
            </a>
            <a href="${rejectUrl}" style="display: inline-block; padding: 12px 30px; margin: 0 10px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Decline Quote
            </a>
          </div>
        `;
      }

      if (diagnosticFeeNotice && !body.toLowerCase().includes("diagnostic fee")) {
        body += `
          <div style="margin: 20px 0; padding: 14px 16px; border-radius: 8px; background: #fff7ed; color: #7c2d12; font-size: 13px; line-height: 1.6;">
            <strong>Diagnostic Fee Notice:</strong> ${diagnosticFeeNotice}
          </div>
        `;
      }

      if (!body.includes("terms-and-conditions")) {
        body += `
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <h4 style="color: #111827; margin: 0 0 8px 0; font-size: 14px;">Terms Summary</h4>
          <ul style="color: #374151; font-size: 13px; line-height: 1.6; margin: 0 0 12px 18px; padding: 0;">
            <li>Inspection fees are non-refundable if repair is declined.</li>
            <li>Customer data must be backed up; eRepair is not liable for data loss.</li>
            <li>3-month return-to-base warranty on repairs (excluding liquid, physical damage &amp; glass replacements).</li>
            <li>No warranty on liquid damage repairs.</li>
            <li>Courier damage is subject to courier terms.</li>
            <li>Devices must be collected within 4 weeks.</li>
            <li>Rights under the NZ Consumer Guarantees Act apply.</li>
          </ul>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            Full Terms &amp; Conditions: <a href="${baseUrl}/terms-and-conditions" style="color: #2563eb; text-decoration: underline;">${baseUrl}/terms-and-conditions</a>
          </p>
        `;
      }

      body = emailLayout(extractBody(body), settings?.companyName || "E-Repair Shop");
      text = `${body.replace(/<[^>]*>/g, "")}\n\nFull Terms & Conditions: ${baseUrl}/terms-and-conditions`;
    } else if (!template) {
      const fallback = quoteSentEmail({
        customerName: `${quote.customer.firstName} ${quote.customer.lastName}`,
        jobNumber: quote.job.jobNumber,
        applianceBrand: quote.job.applianceBrand,
        applianceType: quote.job.applianceType,
        issueDescription: quote.job.issueDescription,
        quotedAmount: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(quote.totalAmount),
        acceptUrl,
        rejectUrl,
        companyName: settings?.companyName || "E-Repair Shop",
        diagnosticFeeAmount:
          typeof diagnosticFeeAmount === "number" ? diagnosticFeeAmount : undefined,
      });
      subject = fallback.subject;
      body = fallback.html;
      text = fallback.text;
    }

    if (subject && body && text) {
      await sendEmail({
        to: quote.customer.email,
        subject,
        html: body,
        text,
        emailType: "QUOTE_SENT",
        relatedId: quote.jobId,
        sentById: session.user.id,
        attachments: [
          {
            filename: `Quote-${quote.quoteNumber}.pdf`,
            content: pdfBase64,
            encoding: "base64",
            contentType: "application/pdf",
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: "Quote resent successfully",
    });
  } catch (error) {
    console.error("Error resending quote:", error);
    return NextResponse.json({ error: "Failed to resend quote" }, { status: 500 });
  }
}
