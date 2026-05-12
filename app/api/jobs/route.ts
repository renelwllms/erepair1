import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withJobAccessScope } from "@/lib/access-control";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { jobConfirmationEmail } from "@/lib/email-templates";
import { getDiagnosticFeeForAppliance, parseDiagnosticFees } from "@/lib/diagnostic-fees";

export const dynamic = 'force-dynamic';

// Validation schema for job
const jobSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  applianceBrand: z.string().min(1, "Appliance brand is required"),
  applianceType: z.string().min(1, "Appliance type is required"),
  modelNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  issueDescription: z.string().min(1, "Issue description is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assignedTechnicianId: z.string().optional(),
  warrantyStatus: z.string().optional(),
  serviceLocation: z.string().optional(),
  estimatedCompletion: z.string().optional(),
  diagnosticFeeAmount: z.number().min(0).optional(),
});

// GET /api/jobs - Get all jobs with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const technicianId = searchParams.get("technicianId");
    const customerId = searchParams.get("customerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    let where: any = {};

    // Search across multiple fields
    if (search) {
      where.OR = [
        { jobNumber: { contains: search, mode: "insensitive" } },
        { applianceBrand: { contains: search, mode: "insensitive" } },
        { applianceType: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Filter by status
    if (status && status !== "all") {
      where.status = status;
    }

    // Filter by priority
    if (priority && priority !== "all") {
      where.priority = priority;
    }

    // Filter by technician
    if (technicianId && technicianId !== "all") {
      where.assignedTechnicianId = technicianId;
    }

    // Filter by customer
    if (customerId) {
      where.customerId = customerId;
    }

    // If user is technician, only show their jobs
    where = withJobAccessScope(where, session.user);

    // Get total count for pagination
    const total = await db.job.count({ where });

    // Get jobs with relations
    const jobs = await db.job.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
          },
        },
        quotes: {
          orderBy: {
            issueDate: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            issueDate: true,
            validUntil: true,
            reminderCount: true,
            lastReminderSent: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs - Bulk delete jobs (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "No job IDs provided" }, { status: 400 });
    }

    const jobsWithInvoices = await db.job.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        jobNumber: true,
        invoice: { select: { id: true } },
      },
    });

    const blocked = jobsWithInvoices.filter((job) => job.invoice);
    if (blocked.length > 0) {
      return NextResponse.json(
        {
          error: "Some jobs have invoices and cannot be deleted",
          jobs: blocked.map((job) => job.jobNumber),
        },
        { status: 400 }
      );
    }

    const result = await db.job.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Error deleting jobs:", error);
    return NextResponse.json({ error: "Failed to delete jobs" }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    const dbAny = db as any;
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can create jobs
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = jobSchema.parse(body);

    const settings = (await db.settings.findFirst({
      select: {
        diagnosticFees: true,
        diagnosticFeeDefaultOther: true,
      },
    })) as any;
    const diagnosticFeeMap = parseDiagnosticFees(settings?.diagnosticFees);
    let diagnosticFeeAmount =
      typeof validatedData.diagnosticFeeAmount === "number"
        ? validatedData.diagnosticFeeAmount
        : getDiagnosticFeeForAppliance(
            validatedData.applianceType,
            diagnosticFeeMap,
            settings?.diagnosticFeeDefaultOther ?? null
          );

    if (validatedData.applianceType === "Other" && diagnosticFeeAmount === null) {
      return NextResponse.json(
        { error: "Diagnostic fee is required for appliance type Other" },
        { status: 400 }
      );
    }

    if (diagnosticFeeAmount === null) {
      diagnosticFeeAmount = 0;
    }

    // Check if customer exists
    const customer = await db.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Generate job number
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

    const jobNumber = `JOB-${nextNumber.toString().padStart(5, "0")}`;

    // Parse estimatedCompletion if provided
    let estimatedCompletionDate = validatedData.estimatedCompletion
      ? new Date(validatedData.estimatedCompletion)
      : null;

    // Create job
    const job = await dbAny.job.create({
      data: {
        jobNumber,
        customerId: validatedData.customerId,
        applianceBrand: validatedData.applianceBrand,
        applianceType: validatedData.applianceType,
        modelNumber: validatedData.modelNumber,
        serialNumber: validatedData.serialNumber,
        issueDescription: validatedData.issueDescription,
        priority: validatedData.priority,
        status: "OPEN",
        assignedTechnicianId: validatedData.assignedTechnicianId,
        createdById: session.user.id,
        warrantyStatus: validatedData.warrantyStatus,
        serviceLocation: validatedData.serviceLocation,
        estimatedCompletion: estimatedCompletionDate,
        diagnosticFeeAmount,
      },
      include: {
        customer: true,
        assignedTechnician: true,
        createdBy: true,
      },
    });

    // Create initial status history entry
    await db.jobStatusHistory.create({
      data: {
        jobId: job.id,
        status: "OPEN",
        notes: "Job created",
        changedBy: session.user.id,
      },
    });

    // Send job creation email notification
    try {
      const template = await db.emailTemplate.findUnique({
        where: { name: "JOB_OPEN" },
      });

      const settings = await db.settings.findFirst();
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const termsUrl = `${baseUrl}/terms-and-conditions`;
      const trackingUrl = `${baseUrl}/track-job?jobNumber=${job.jobNumber}`;

      if (template && template.isActive) {
        // Replace template variables
        const variables = {
          customerName: `${customer.firstName} ${customer.lastName}`,
          jobNumber: job.jobNumber,
          applianceBrand: job.applianceBrand,
          applianceType: job.applianceType,
          issueDescription: job.issueDescription,
          companyName: settings?.companyName || "E-Repair Shop",
        };

        const subject = template.subject.replace(/{{(\w+)}}/g, (match, key) => variables[key as keyof typeof variables] || match);
        let body = template.body.replace(/{{(\w+)}}/g, (match, key) => variables[key as keyof typeof variables] || match);

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

        if (!body.includes("terms-and-conditions")) {
          body += termsHtml;
        }

        await sendEmail({
          to: customer.email,
          subject,
          html: body,
          text: `${body.replace(/<[^>]*>/g, "")}\n\nFull Terms & Conditions: ${termsUrl}`,
          emailType: "JOB_CREATED",
          relatedId: job.id,
          sentById: session.user.id,
        });
      } else {
        const fallback = jobConfirmationEmail({
          jobNumber: job.jobNumber,
          customerName: `${customer.firstName} ${customer.lastName}`,
          applianceType: job.applianceType,
          applianceBrand: job.applianceBrand,
          issueDescription: job.issueDescription,
          trackingUrl,
          companyName: settings?.companyName || "E-Repair Shop",
        });

        await sendEmail({
          to: customer.email,
          subject: fallback.subject,
          html: fallback.html,
          text: fallback.text,
          emailType: "JOB_CREATED",
          relatedId: job.id,
          sentById: session.user.id,
        });
      }
    } catch (emailError) {
      console.error("Failed to send job creation email:", emailError);
      // Don't fail the job creation if email fails
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
