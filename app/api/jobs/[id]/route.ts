import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessJob } from "@/lib/access-control";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { diagnosticFeePaidEmail } from "@/lib/email-templates";

export const dynamic = 'force-dynamic';

// Validation schema for job update
const jobUpdateSchema = z.object({
  jobType: z.enum(["WORKSHOP_REPAIR", "CALLOUT_REPAIR"]).optional(),
  applianceBrand: z.string().min(1, "Appliance brand is required").optional(),
  applianceType: z.string().min(1, "Appliance type is required").optional(),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(1, "Issue description is required").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedTechnicianId: z.string().nullable().optional(),
  warrantyStatus: z.string().optional(),
  serviceLocation: z.string().optional(),
  estimatedCompletion: z.string().nullable().optional(),
  laborHours: z.number().optional(),
  diagnosticResults: z.string().optional(),
  technicianNotes: z.string().optional(),
  customerNotes: z.string().optional(),
  diagnosticFeeAmount: z.number().min(0).optional(),
  diagnosticFeePaid: z.boolean().optional(),
  diagnosticFeePaidAt: z.string().nullable().optional(),
  diagnosticFeePaymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "CHECK", "OTHER"]).nullable().optional(),
  diagnosticFeeAppliedToInvoice: z.boolean().optional(),
  repairApproved: z.boolean().optional(),
  calloutAddress: z.string().nullable().optional(),
  preferredCalloutDate: z.string().nullable().optional(),
  calloutAccessInstructions: z.string().nullable().optional(),
  calloutParkingNotes: z.string().nullable().optional(),
  calloutApplianceLocation: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.jobType !== "CALLOUT_REPAIR") {
    return;
  }

  const requiredFields: Array<[keyof typeof data, string]> = [
    ["calloutAddress", "Full address is required for callout repairs"],
    ["preferredCalloutDate", "Preferred date/time is required for callout repairs"],
    ["calloutAccessInstructions", "Access instructions are required for callout repairs"],
    ["calloutParkingNotes", "Parking notes are required for callout repairs"],
    ["calloutApplianceLocation", "Appliance location is required for callout repairs"],
  ];

  for (const [field, message] of requiredFields) {
    if (!data[field]?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message,
      });
    }
  }
});

// GET /api/jobs/[id] - Get a single job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await db.job.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: "desc",
          },
        },
        jobParts: {
          include: {
            part: true,
          },
        },
        communications: {
          orderBy: {
            createdAt: "desc",
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
          },
        },
        quotes: {
          orderBy: {
            issueDate: "desc",
          },
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            issueDate: true,
            validUntil: true,
            reminderCount: true,
            lastReminderSent: true,
          },
        },
        warrantyParentJob: {
          select: {
            id: true,
            jobNumber: true,
            status: true,
          },
        },
        warrantyFollowUpJobs: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            jobNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (!(await canAccessJob(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/[id] - Update a job
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbAny = db as any;
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can update jobs
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = jobUpdateSchema.parse(body);

    // Check if job exists
    const existingJob = await db.job.findUnique({
      where: { id: params.id },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Check permissions: Technicians can only update their own jobs
    if (
      session.user.role === "TECHNICIAN" &&
      existingJob.assignedTechnicianId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse estimatedCompletion if provided
    let estimatedCompletionDate: Date | null | undefined = undefined;
    if (validatedData.estimatedCompletion !== undefined) {
      estimatedCompletionDate = validatedData.estimatedCompletion
        ? new Date(validatedData.estimatedCompletion)
        : null;
    }

    let diagnosticFeePaidAtDate: Date | null | undefined = undefined;
    if (validatedData.diagnosticFeePaidAt !== undefined) {
      diagnosticFeePaidAtDate = validatedData.diagnosticFeePaidAt
        ? new Date(validatedData.diagnosticFeePaidAt)
        : null;
    }
    let preferredCalloutDate: Date | null | undefined = undefined;
    if (validatedData.preferredCalloutDate !== undefined) {
      preferredCalloutDate = validatedData.preferredCalloutDate
        ? new Date(validatedData.preferredCalloutDate)
        : null;
    }

    const nextJobType = validatedData.jobType ?? existingJob.jobType ?? (existingJob.isCallout ? "CALLOUT_REPAIR" : "WORKSHOP_REPAIR");
    const isCallout = nextJobType === "CALLOUT_REPAIR";

    // Update job
    const job = await dbAny.job.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        jobType: nextJobType,
        isCallout,
        estimatedCompletion: estimatedCompletionDate,
        diagnosticFeePaidAt: diagnosticFeePaidAtDate,
        preferredCalloutDate,
        calloutAddress: isCallout ? validatedData.calloutAddress ?? existingJob.calloutAddress : null,
        calloutAccessInstructions: isCallout ? validatedData.calloutAccessInstructions ?? existingJob.calloutAccessInstructions : null,
        calloutParkingNotes: isCallout ? validatedData.calloutParkingNotes ?? existingJob.calloutParkingNotes : null,
        calloutApplianceLocation: isCallout ? validatedData.calloutApplianceLocation ?? existingJob.calloutApplianceLocation : null,
      },
      include: {
        customer: true,
        assignedTechnician: true,
        createdBy: true,
      },
    });

    const diagnosticFeePaidNow =
      validatedData.diagnosticFeePaid === true &&
      existingJob.diagnosticFeePaid !== true &&
      Number(job.diagnosticFeeAmount || 0) > 0;

    if (diagnosticFeePaidNow && job.customer?.email) {
      try {
        const settings = await db.settings.findFirst({
          select: {
            companyName: true,
            companyLogo: true,
          },
        });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const logoUrl =
          settings?.companyLogo && settings.companyLogo.startsWith("/")
            ? `${baseUrl}${settings.companyLogo}`
            : settings?.companyLogo || null;

        const emailContent = diagnosticFeePaidEmail({
          customerName: `${job.customer.firstName} ${job.customer.lastName}`,
          jobNumber: job.jobNumber,
          diagnosticFeeAmount: Number(job.diagnosticFeeAmount || 0),
          companyName: settings?.companyName || "E-Repair Shop",
        });

        await sendEmail({
          to: job.customer.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          emailType: "DIAGNOSTIC_FEE_PAID",
          relatedId: job.id,
          sentById: session.user.id,
        });
      } catch (emailError) {
        console.error("Failed to send diagnostic fee paid email:", emailError);
      }
    }

    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Delete a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete jobs
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if job exists
    const job = await db.job.findUnique({
      where: { id: params.id },
      include: {
        invoice: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Check if job has an invoice
    if (job.invoice) {
      return NextResponse.json(
        {
          error: "Cannot delete job with existing invoice",
          details: {
            invoiceNumber: job.invoice.invoiceNumber,
          },
        },
        { status: 400 }
      );
    }

    // Delete job (cascade will delete related records)
    await db.job.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
