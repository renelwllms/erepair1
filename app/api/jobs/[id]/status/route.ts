import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessJob } from "@/lib/access-control";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { jobCompletedEmail, statusUpdateEmail } from "@/lib/email-templates";
import { sendJobStatusNotification } from "@/lib/push-notifications";

const statusUpdateSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "AWAITING_PARTS",
    "AWAITING_CUSTOMER_APPROVAL",
    "READY_FOR_PICKUP",
    "CLOSED",
    "CANCELLED",
    "CUSTOMER_CANCELLED",
  ]),
  notes: z.string().optional(),
});

// Map status to email template name
const statusToTemplateName: Record<string, string> = {
  OPEN: "JOB_OPEN",
  IN_PROGRESS: "JOB_IN_PROGRESS",
  AWAITING_PARTS: "AWAITING_PARTS",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  CLOSED: "JOB_CLOSED",
  CUSTOMER_CANCELLED: "CUSTOMER_CANCELLED",
};

// Replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp("{{" + key + "}}", "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

// PUT /api/jobs/[id]/status - Update job status
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbAny = db as any;
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = statusUpdateSchema.parse(body);

    const job = (await db.job.findUnique({ where: { id: params.id }, include: { customer: true } })) as any;
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!(await canAccessJob(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const previousStatus = job.status;

    const updatedJob = await db.job.update({
      where: { id: params.id },
      data: { status: validatedData.status, lastNotificationSent: new Date() },
    });

    await db.jobStatusHistory.create({
      data: { jobId: params.id, status: validatedData.status, notes: validatedData.notes, changedBy: session.user.id },
    });

    if (validatedData.status === "CLOSED") {
      const existingInvoice = await db.invoice.findUnique({
        where: { jobId: params.id },
        select: { id: true },
      });

      if (!existingInvoice && job.diagnosticFeeAmount > 0 && !job.repairApproved) {
        const settings = await db.settings.findFirst();
        const lastInvoice = await dbAny.invoice.findFirst({
          orderBy: { invoiceNumber: "desc" },
          select: { invoiceNumber: true },
        });

        let nextNumber = 1;
        if (lastInvoice) {
          const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }

        let invoiceNumber = `INV-${nextNumber.toString().padStart(5, "0")}`;
        let invoiceExists = await dbAny.invoice.findUnique({ where: { invoiceNumber } });
        while (invoiceExists) {
          nextNumber++;
          invoiceNumber = `INV-${nextNumber.toString().padStart(5, "0")}`;
          invoiceExists = await dbAny.invoice.findUnique({ where: { invoiceNumber } });
        }

        const taxRate = settings?.taxRate || 0;
        const subtotal = job.diagnosticFeeAmount;
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;

        const invoice = await dbAny.invoice.create({
          data: {
            invoiceNumber,
            jobId: job.id,
            customerId: job.customerId,
            issuedById: session.user.id,
            status: "DRAFT",
            issueDate: new Date(),
            dueDate: new Date(),
            subtotal,
            taxRate,
            taxAmount,
            discountAmount: 0,
            totalAmount,
            paidAmount: 0,
            balanceAmount: totalAmount,
            notes: "Diagnostic / Assessment Fee",
            paymentTerms: "Payment due upon collection of the device",
            invoiceItems: {
              create: [
                {
                  description: "Diagnostic / Assessment Fee",
                  quantity: 1,
                  unitPrice: job.diagnosticFeeAmount,
                  totalPrice: job.diagnosticFeeAmount,
                  itemType: "SERVICE_FEE",
                },
              ],
            },
          },
        });

        await dbAny.job.update({
          where: { id: job.id },
          data: { diagnosticFeeAppliedToInvoice: false },
        });
      }
    }

    const notesForEmail =
      validatedData.notes && validatedData.notes.includes("via job list")
        ? undefined
        : validatedData.notes;

    void (async () => {
      // Send push notification
      try {
        await sendJobStatusNotification(params.id, validatedData.status, validatedData.notes);
      } catch (pushError) {
        console.error("Failed to send push notification:", pushError);
      }

      const templateName = statusToTemplateName[validatedData.status];
      if (templateName) {
        try {
          const settings = await db.settings.findFirst();
          let template = await db.emailTemplate.findUnique({ where: { name: templateName } });

          if (!template) {
            template = await db.emailTemplate.findUnique({ where: { name: templateName.toLowerCase() } });
          }

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const termsUrl = `${baseUrl}/terms-and-conditions`;
          const termsHtml = `
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
              Full Terms &amp; Conditions: <a href="${termsUrl}" style="color: #2563eb; text-decoration: underline;">${termsUrl}</a>
            </p>
          `;

          if (template && template.isActive) {
            const variables = {
              customerName: job.customer.firstName + " " + job.customer.lastName,
              jobNumber: job.jobNumber,
              applianceBrand: job.applianceBrand,
              applianceType: job.applianceType,
              issueDescription: job.issueDescription,
              companyName: settings?.companyName || "E-Repair Shop",
            };

            const subject = replaceTemplateVariables(template.subject, variables);
            let body = replaceTemplateVariables(template.body, variables);
            if (!body.includes("terms-and-conditions")) {
              body += termsHtml;
            }

            await sendEmail({
              to: job.customer.email,
              subject,
              html: body,
              text: `${body.replace(/<[^>]*>/g, "")}\n\nFull Terms & Conditions: ${termsUrl}`,
              emailType: "STATUS_UPDATE",
              relatedId: job.id,
              sentById: session.user.id,
            });
          } else {
            const trackingUrl = `${baseUrl}/track-job?jobNumber=${job.jobNumber}`;
            const fallback = validatedData.status === "CLOSED"
              ? jobCompletedEmail({
                  jobNumber: job.jobNumber,
                  customerName: `${job.customer.firstName} ${job.customer.lastName}`,
                  applianceType: job.applianceType,
                  trackingUrl,
                  companyName: settings?.companyName || "E-Repair Shop",
                })
              : statusUpdateEmail({
                  jobNumber: job.jobNumber,
                  customerName: `${job.customer.firstName} ${job.customer.lastName}`,
                  applianceType: job.applianceType,
                  oldStatus: previousStatus,
                  newStatus: validatedData.status,
                  notes: notesForEmail,
                  trackingUrl,
                  companyName: settings?.companyName || "E-Repair Shop",
                });

            await sendEmail({
              to: job.customer.email,
              subject: fallback.subject,
              html: fallback.html,
              text: fallback.text,
              emailType: "STATUS_UPDATE",
              relatedId: job.id,
              sentById: session.user.id,
            });
          }
        } catch (emailError) {
          console.error("Failed to send status update email:", emailError);
        }
      } else {
        try {
          const settings = await db.settings.findFirst();
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const trackingUrl = `${baseUrl}/track-job?jobNumber=${job.jobNumber}`;
          const fallback = validatedData.status === "CLOSED"
            ? jobCompletedEmail({
                jobNumber: job.jobNumber,
                customerName: `${job.customer.firstName} ${job.customer.lastName}`,
                applianceType: job.applianceType,
                trackingUrl,
                companyName: settings?.companyName || "E-Repair Shop",
              })
            : statusUpdateEmail({
                jobNumber: job.jobNumber,
                customerName: `${job.customer.firstName} ${job.customer.lastName}`,
                applianceType: job.applianceType,
                oldStatus: previousStatus,
                newStatus: validatedData.status,
                notes: notesForEmail,
                trackingUrl,
                companyName: settings?.companyName || "E-Repair Shop",
              });

          await sendEmail({
            to: job.customer.email,
            subject: fallback.subject,
            html: fallback.html,
            text: fallback.text,
            emailType: "STATUS_UPDATE",
            relatedId: job.id,
            sentById: session.user.id,
          });
        } catch (emailError) {
          console.error("Failed to send status update email:", emailError);
        }
      }
    })();

    const jobWithInvoice = await db.job.findUnique({
      where: { id: params.id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
          },
        },
      },
    });

    return NextResponse.json(jobWithInvoice ?? updatedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error updating job status:", error);
    return NextResponse.json({ error: "Failed to update job status" }, { status: 500 });
  }
}
