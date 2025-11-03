import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

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
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = statusUpdateSchema.parse(body);

    const job = await db.job.findUnique({ where: { id: params.id }, include: { customer: true } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const updatedJob = await db.job.update({
      where: { id: params.id },
      data: { status: validatedData.status, lastNotificationSent: new Date() },
    });

    await db.jobStatusHistory.create({
      data: { jobId: params.id, status: validatedData.status, notes: validatedData.notes, changedBy: session.user.id },
    });

    const templateName = statusToTemplateName[validatedData.status];
    if (templateName) {
      try {
        const template = await db.emailTemplate.findUnique({ where: { name: templateName } });
        if (template && template.isActive) {
          const settings = await db.settings.findFirst();
          const variables = {
            customerName: job.customer.firstName + " " + job.customer.lastName,
            jobNumber: job.jobNumber,
            applianceBrand: job.applianceBrand,
            applianceType: job.applianceType,
            issueDescription: job.issueDescription,
            companyName: settings?.companyName || "E-Repair Shop",
          };

          const subject = replaceTemplateVariables(template.subject, variables);
          const body = replaceTemplateVariables(template.body, variables);

          await sendEmail({
            to: job.customer.email,
            subject,
            html: body,
            text: body.replace(/<[^>]*>/g, ""),
            emailType: "STATUS_UPDATE",
            relatedId: job.id,
            sentById: session.user.id,
          });
        }
      } catch (emailError) {
        console.error("Failed to send status update email:", emailError);
      }
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error updating job status:", error);
    return NextResponse.json({ error: "Failed to update job status" }, { status: 500 });
  }
}
