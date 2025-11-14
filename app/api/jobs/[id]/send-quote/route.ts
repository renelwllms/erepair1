import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { generateQuotePDF } from "@/lib/quote-generator";
import { addDays, format } from "date-fns";

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

    // Generate quote number (using job number + Q suffix)
    const quoteNumber = `${job.jobNumber}-Q`;
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
        address: job.customer.address,
        city: job.customer.city,
        state: job.customer.state,
        zipCode: job.customer.zipCode,
      },
      job: {
        jobNumber: job.jobNumber,
        applianceType: job.applianceType,
        applianceBrand: job.applianceBrand,
        modelNumber: job.modelNumber,
        issueDescription: job.issueDescription,
        diagnosticResults: job.diagnosticResults,
      },
      quoteItems: validatedData.quoteItems,
      subtotal: validatedData.subtotal,
      taxRate: validatedData.taxRate,
      taxAmount: validatedData.taxAmount,
      totalAmount: validatedData.totalAmount,
      notes: validatedData.notes,
      termsAndConditions: settings?.termsAndConditions,
      companyName: settings?.companyName || "E-Repair Shop",
      companyEmail: settings?.companyEmail,
      companyPhone: settings?.companyPhone,
      companyAddress: settings?.companyAddress,
      companyLogo: settings?.companyLogo,
    };

    // Generate PDF
    const pdfDoc = await generateQuotePDF(quoteData);
    const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
    const pdfBase64 = pdfBuffer.toString("base64");

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
    try {
      const template = await db.emailTemplate.findUnique({
        where: { name: "QUOTE_SENT" },
      });

      if (template && template.isActive) {
        // Generate accept/reject URLs
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const acceptUrl = `${baseUrl}/quote/accept/${quote.id}`;
        const rejectUrl = `${baseUrl}/quote/reject/${quote.id}`;

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
        };

        const subject = replaceTemplateVariables(template.subject, variables);
        let body = replaceTemplateVariables(template.body, variables);

        // Add accept/reject buttons if not in template
        if (!body.includes("acceptUrl") && !body.includes("rejectUrl")) {
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

        await sendEmail({
          to: job.customer.email,
          subject,
          html: body,
          text: body.replace(/<[^>]*>/g, ""),
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
      // Don't fail the entire request if email fails
    }

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
