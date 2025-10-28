import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

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
    const where: any = {};

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
    if (session.user.role === "TECHNICIAN") {
      where.assignedTechnicianId = session.user.id;
    }

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

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
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
    const job = await db.job.create({
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
