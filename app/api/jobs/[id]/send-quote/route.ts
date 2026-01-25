import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { generateQuotePDF } from "@/lib/quote-generator";
import { addDays, format } from "date-fns";
import { emailLayout, quoteSentEmail } from "@/lib/email-templates";

const quoteItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

const sendQuoteSchema = z.object({
  quoteItems: z.array(quoteItemSchema).min(1, "At least one quote item is required"),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(100),
  taxAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
  validDays: z.number().min(1).default(30),
});

// Replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp("{{" + key + "}}", "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

// POST /api/jobs/[id]/send-quote - Generate and send quote
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = sendQuoteSchema.parse(body);

    // Get job with customer details
    const job = await db.job.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get settings for company info
    const settings = await db.settings.findFirst();

    // Generate quote number (use -Q for first quote, then -Q2, -Q3, ...)
    const existingQuoteCount = await db.quote.count({
      where: { jobId: job.id },
    });
    const quoteNumber =
      existingQuoteCount === 0
        ? `${job.jobNumber}-Q`
        : `${job.jobNumber}-Q${existingQuoteCount + 1}`;
    const issueDate = new Date().toISOString();
    const validUntil = addDays(new Date(), validatedData.validDays).toISOString();

    // Prepare quote data
    const quoteData = {
      quoteNumber,
      issueDate,
      validUntil,
      customer: {
        firstName: job.customer.firstName,
        lastName: job.customer.lastName,
        email: job.customer.email,
        phone: job.customer.phone,
        address: job.customer.address || undefined,
        city: job.customer.city || undefined,
        state: job.customer.state || undefined,
        zipCode: job.customer.zipCode || undefined,
      },
      job: {
        jobNumber: job.jobNumber,
        applianceType: job.applianceType,
        applianceBrand: job.applianceBrand,
        modelNumber: job.modelNumber || undefined,
        issueDescription: job.issueDescription,
        diagnosticResults: job.diagnosticResults || undefined,
      },
      quoteItems: validatedData.quoteItems,
      subtotal: validatedData.subtotal,
      taxRate: validatedData.taxRate,
      taxAmount: validatedData.taxAmount,
      totalAmount: validatedData.totalAmount,
      diagnosticFeeAmount: typeof job.diagnosticFeeAmount === "number" ? job.diagnosticFeeAmount : undefined,
      notes: validatedData.notes,
      termsAndConditions: settings?.termsAndConditions || undefined,
      companyName: settings?.companyName || "E-Repair Shop",
      companyEmail: settings?.companyEmail || undefined,
      companyPhone: settings?.companyPhone || undefined,
      companyAddress: settings?.companyAddress || undefined,
      companyLogo: settings?.companyLogo || undefined,
    };

    // Create Quote record in database
    const quote = await db.quote.create({
      data: {
        quoteNumber,
        jobId: params.id,
        customerId: job.customerId,
        issuedById: session.user.id,
        status: "SENT",
        issueDate: new Date(issueDate),
        validUntil: new Date(validUntil),
        subtotal: validatedData.subtotal,
        taxRate: validatedData.taxRate,
        taxAmount: validatedData.taxAmount,
        discountAmount: 0,
        totalAmount: validatedData.totalAmount,
        notes: validatedData.notes,
        quoteData: JSON.stringify(quoteData),
        quoteItems: {
          create: validatedData.quoteItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            itemType: "PART", // You might want to determine this from the item
          })),
        },
      },
    });

    // Update job status and set quoteSentAt
    const updatedJob = await db.job.update({
      where: { id: params.id },
      data: {
        status: "AWAITING_CUSTOMER_APPROVAL",
        quoteSentAt: new Date(),
        lastNotificationSent: new Date(),
      },
    });

    // Create status history entry
    await db.jobStatusHistory.create({
      data: {
        jobId: params.id,
        status: "AWAITING_CUSTOMER_APPROVAL",
        notes: `Quote sent: ${quoteNumber} - Total: ${validatedData.totalAmount}`,
        changedBy: session.user.id,
      },
    });

    // Send email with quote PDF
    void (async () => {
      try {
        // Generate PDF in the background to avoid blocking the response
        const pdfDoc = await generateQuotePDF(quoteData);
        const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
        const pdfBase64 = pdfBuffer.toString("base64");

        let template = await db.emailTemplate.findUnique({
          where: { name: "QUOTE_SENT" },
        });
        if (!template) {
          template = await db.emailTemplate.findUnique({
            where: { name: "quote_sent" },
          });
        }

        // Generate accept/reject URLs
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const acceptUrl = `${baseUrl}/quote/accept/${quote.id}`;
        const rejectUrl = `${baseUrl}/quote/reject/${quote.id}`;

        const diagnosticFeeAmount =
          typeof job.diagnosticFeeAmount === "number" ? job.diagnosticFeeAmount : null;
        const diagnosticFeeNotice =
          typeof diagnosticFeeAmount === "number" && diagnosticFeeAmount > 0
            ? `Diagnostic fee of ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(diagnosticFeeAmount)} is non-refundable if you decide not to proceed. If you approve the repair, this fee will be credited toward your final invoice.`
            : null;

        const variables = {
          customerName: `${job.customer.firstName} ${job.customer.lastName}`,
          jobNumber: job.jobNumber,
          applianceBrand: job.applianceBrand,
          applianceType: job.applianceType,
          issueDescription: job.issueDescription,
          companyName: settings?.companyName || "E-Repair Shop",
          quotedAmount: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(validatedData.totalAmount),
          acceptUrl,
          rejectUrl,
          diagnosticFeeAmount:
            typeof diagnosticFeeAmount === "number"
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(diagnosticFeeAmount)
              : "",
          diagnosticFeeNotice: diagnosticFeeNotice || "",
        };

        let subject: string | null = null;
        let body: string | null = null;
        let text: string | null = null;

        const extractBody = (html: string) => {
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          return bodyMatch ? bodyMatch[1] : html;
        };

        if (template && template.isActive) {
          subject = replaceTemplateVariables(template.subject, variables);
          body = replaceTemplateVariables(template.body, variables);

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

          body = emailLayout(extractBody(body), variables.companyName);
          text = `${body.replace(/<[^>]*>/g, "")}\n\nFull Terms & Conditions: ${baseUrl}/terms-and-conditions`;
        } else if (!template) {
          const fallback = quoteSentEmail({
            customerName: variables.customerName,
            jobNumber: variables.jobNumber,
            applianceBrand: variables.applianceBrand,
            applianceType: variables.applianceType,
            issueDescription: variables.issueDescription,
            quotedAmount: variables.quotedAmount,
            acceptUrl,
            rejectUrl,
            companyName: variables.companyName,
            diagnosticFeeAmount:
              typeof diagnosticFeeAmount === "number" ? diagnosticFeeAmount : undefined,
          });
          subject = fallback.subject;
          body = fallback.html;
          text = fallback.text;
        }

        if (subject && body && text) {
          await sendEmail({
            to: job.customer.email,
            subject,
            html: body,
            text,
            emailType: "QUOTE_SENT",
            relatedId: job.id,
            sentById: session.user.id,
            attachments: [
              {
                filename: `Quote-${quoteNumber}.pdf`,
                content: pdfBase64,
                encoding: "base64",
                contentType: "application/pdf",
              },
            ],
          });
        }
      } catch (emailError) {
        console.error("Failed to send quote email:", emailError);
      }
    })();

    return NextResponse.json({
      success: true,
      job: updatedJob,
      quoteNumber,
      message: "Quote generated and sent successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error sending quote:", error);
    return NextResponse.json({ error: "Failed to send quote" }, { status: 500 });
  }
}
