import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schema for customer
const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  customerType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).default("RESIDENTIAL"),
  notes: z.string().optional(),
});

// GET /api/customers - Get all customers with optional search and filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const customerType = searchParams.get("customerType");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    // Search across multiple fields
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    // Filter by customer type
    if (customerType && (customerType === "RESIDENTIAL" || customerType === "COMMERCIAL")) {
      where.customerType = customerType;
    }

    // Get total count for pagination
    const total = await db.customer.count({ where });

    // Get customers with relations
    const customers = await db.customer.findMany({
      where,
      include: {
        jobs: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate stats for each customer
    const customersWithStats = customers.map((customer) => ({
      ...customer,
      totalJobs: customer.jobs.length,
      totalRevenue: customer.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
      openJobs: customer.jobs.filter((job) =>
        job.status === "OPEN" || job.status === "IN_PROGRESS" || job.status === "AWAITING_PARTS"
      ).length,
    }));

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can create customers
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = customerSchema.parse(body);

    // Check if customer with email already exists
    const existingCustomer = await db.customer.findUnique({
      where: { email: validatedData.email },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Customer with this email already exists" },
        { status: 400 }
      );
    }

    // Create customer
    const customer = await db.customer.create({
      data: validatedData,
      include: {
        jobs: true,
        invoices: true,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
