import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { statusUpdateEmail, readyForPickupEmail } from "@/lib/email-templates";

// Validation schema for status update
const statusUpdateSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "AWAITING_PARTS",
    "READY_FOR_PICKUP",
    "CLOSED",
    "CANCELLED",
  ]),
  notes: z.string().optional(),
});

// PUT /api/jobs/[id]/status - Update job status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can update status
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = statusUpdateSchema.parse(body);

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

    // Don't update if status is the same
    if (existingJob.status === validatedData.status) {
      return NextResponse.json(
        { error: "Job already has this status" },
        { status: 400 }
      );
    }

    // Update job status
    const actualCompletionDate =
      validatedData.status === "CLOSED" ? new Date() : null;

    const job = await db.job.update({
      where: { id: params.id },
      data: {
        status: validatedData.status,
        actualCompletion: actualCompletionDate,
      },
      include: {
        customer: true,
        assignedTechnician: true,
        createdBy: true,
      },
    });

    // Create status history entry
    await db.jobStatusHistory.create({
      data: {
        jobId: job.id,
        status: validatedData.status,
        notes: validatedData.notes || `Status changed to ${validatedData.status}`,
        changedBy: session.user.id,
      },
    });

    // Send email notification to customer
    try {
      const trackingUrl = `${request.nextUrl.origin}/track-job?jobNumber=${job.jobNumber}`;

      // Get settings for shop info (for ready for pickup emails)
      const settings = await db.settings.findFirst();

      let emailContent;

      if (validatedData.status === "READY_FOR_PICKUP") {
        // Special email for ready for pickup
        emailContent = readyForPickupEmail({
          jobNumber: job.jobNumber,
          customerName: `${job.customer.firstName} ${job.customer.lastName}`,
          applianceType: job.applianceType,
          trackingUrl,
          shopAddress: settings?.companyAddress,
          shopPhone: settings?.companyPhone,
          shopHours: "Mon-Fri: 9AM-6PM, Sat: 10AM-4PM", // You can add this to settings
        });
      } else {
        // Regular status update email
        emailContent = statusUpdateEmail({
          jobNumber: job.jobNumber,
          customerName: `${job.customer.firstName} ${job.customer.lastName}`,
          applianceType: job.applianceType,
          oldStatus: existingJob.status,
          newStatus: validatedData.status,
          notes: validatedData.notes,
          trackingUrl,
        });
      }

      await sendEmail({
        to: job.customer.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        emailType: "STATUS_UPDATE",
        relatedId: job.id,
        sentById: session.user.id,
      });
    } catch (emailError) {
      // Log email error but don't fail the status update
      console.error("Failed to send status update email:", emailError);
    }

    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating job status:", error);
    return NextResponse.json(
      { error: "Failed to update job status" },
      { status: 500 }
    );
  }
}
