import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessJob } from "@/lib/access-control";
import { z } from "zod";

const warrantyReturnSchema = z.object({
  action: z.enum(["REOPEN", "CREATE_LINKED"]),
  issueDescription: z.string().min(1, "Issue description is required").optional(),
  notes: z.string().optional(),
});

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

async function generateJobNumber() {
  const lastJob = await db.job.findFirst({
    orderBy: { createdAt: "desc" },
    select: { jobNumber: true },
  });

  let nextNumber = 1;
  if (lastJob) {
    const match = lastJob.jobNumber.match(/JOB-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `JOB-${nextNumber.toString().padStart(5, "0")}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await canAccessJob(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actor = await resolveActiveStaffUser(session);
    if (!actor || !actor.isActive) {
      return NextResponse.json(
        { error: "Your login session is out of sync with the user record. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    const requestBody = await request.json();
    const validatedData = warrantyReturnSchema.parse(requestBody);

    const sourceJob = await db.job.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedTechnician: {
          select: { id: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, status: true },
        },
      },
    });

    if (!sourceJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (validatedData.action === "REOPEN") {
      const reopenedJob = await db.job.update({
        where: { id: sourceJob.id },
        data: {
          status: "IN_PROGRESS",
          actualCompletion: null,
          warrantyStatus: "WARRANTY_RETURN",
        },
        include: {
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
        },
      });

      const noteParts = [
        `Warranty return: reopened existing job ${sourceJob.jobNumber}.`,
        validatedData.issueDescription ? `Reported issue: ${validatedData.issueDescription}` : null,
        validatedData.notes ? `Internal notes: ${validatedData.notes}` : null,
        sourceJob.invoice ? `Manual refund payouts can be tracked on invoice ${sourceJob.invoice.invoiceNumber}.` : "Manual refund payouts can be tracked from the related invoice when available.",
      ].filter(Boolean);

      await db.jobStatusHistory.create({
        data: {
          jobId: sourceJob.id,
          status: "IN_PROGRESS",
          notes: noteParts.join(" "),
          changedBy: actor.id,
        },
      });

      return NextResponse.json({
        success: true,
        action: "REOPEN",
        job: reopenedJob,
        message: "Job reopened under warranty. Manual refund payouts can be tracked from the invoice.",
      });
    }

    const newJobNumber = await generateJobNumber();
    const linkedIssueDescription =
      validatedData.issueDescription ||
      `Warranty return for ${sourceJob.jobNumber}: ${sourceJob.issueDescription}`;

    const createdJob = await db.job.create({
      data: {
        jobNumber: newJobNumber,
        customerId: sourceJob.customerId,
        warrantyParentJobId: sourceJob.id,
        applianceBrand: sourceJob.applianceBrand,
        applianceType: sourceJob.applianceType,
        modelNumber: sourceJob.modelNumber,
        serialNumber: sourceJob.serialNumber,
        issueDescription: linkedIssueDescription,
        priority: sourceJob.priority,
        status: "OPEN",
        assignedTechnicianId: sourceJob.assignedTechnicianId,
        createdById: actor.id,
        warrantyStatus: "WARRANTY_RETURN",
        serviceLocation: sourceJob.serviceLocation,
        diagnosticResults: sourceJob.diagnosticResults,
        technicianNotes: validatedData.notes || undefined,
        diagnosticFeeAmount: 0,
        diagnosticFeePaid: false,
        diagnosticFeePaidAt: null,
        diagnosticFeePaymentMethod: null,
        diagnosticFeeAppliedToInvoice: false,
        repairApproved: false,
        isWarrantyReturn: true,
      },
      include: {
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
      },
    });

    await db.jobStatusHistory.create({
      data: {
        jobId: createdJob.id,
        status: "OPEN",
        notes: [
          `Warranty return job created from ${sourceJob.jobNumber}.`,
          sourceJob.invoice ? `Original invoice: ${sourceJob.invoice.invoiceNumber}.` : null,
          validatedData.notes ? `Internal notes: ${validatedData.notes}` : null,
          "Manual refund payouts can be tracked from the original invoice.",
        ]
          .filter(Boolean)
          .join(" "),
        changedBy: actor.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        action: "CREATE_LINKED",
        job: createdJob,
        message: "Linked warranty return job created. Manual refund payouts can be tracked from the original invoice.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error handling warranty return:", error);
    return NextResponse.json(
      { error: "Failed to handle warranty return" },
      { status: 500 }
    );
  }
}
