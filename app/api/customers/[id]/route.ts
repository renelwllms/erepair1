import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schema for customer update
const customerUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().min(1, "Phone is required").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  customerType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).optional(),
  notes: z.string().optional(),
});

// GET /api/customers/[id] - Get a single customer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: { id: params.id },
      include: {
        jobs: {
          include: {
            assignedTechnician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        invoices: {
          include: {
            job: {
              select: {
                jobNumber: true,
                applianceType: true,
              },
            },
          },
          orderBy: {
            issueDate: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Calculate customer statistics
    const stats = {
      totalJobs: customer.jobs.length,
      openJobs: customer.jobs.filter((job) =>
        job.status === "OPEN" || job.status === "IN_PROGRESS" || job.status === "AWAITING_PARTS"
      ).length,
      completedJobs: customer.jobs.filter((job) => job.status === "CLOSED").length,
      totalRevenue: customer.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
      totalOwed: customer.invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0),
    };

    return NextResponse.json({
      ...customer,
      stats,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can update customers
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = customerUpdateSchema.parse(body);

    // Check if customer exists
    const existingCustomer = await db.customer.findUnique({
      where: { id: params.id },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // If email is being updated, check if it's already in use
    if (validatedData.email && validatedData.email !== existingCustomer.email) {
      const emailInUse = await db.customer.findUnique({
        where: { email: validatedData.email },
      });

      if (emailInUse) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Update customer
    const customer = await db.customer.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        jobs: true,
        invoices: true,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete customers
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if customer exists
    const customer = await db.customer.findUnique({
      where: { id: params.id },
      include: {
        jobs: true,
        invoices: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has any jobs or invoices
    if (customer.jobs.length > 0 || customer.invoices.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete customer with existing jobs or invoices",
          details: {
            jobs: customer.jobs.length,
            invoices: customer.invoices.length,
          },
        },
        { status: 400 }
      );
    }

    // Delete customer
    await db.customer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
