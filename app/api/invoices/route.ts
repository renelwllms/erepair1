import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schema for invoice creation
const invoiceCreateSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  customerId: z.string().min(1, "Customer ID is required"),
  dueDate: z.string().datetime(),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
    itemType: z.enum(["PART", "LABOR", "SERVICE_FEE", "TAX", "DISCOUNT"]),
  })).min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
});

// GET /api/invoices - List invoices with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId") || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Fetch invoices with customer and job details
    const [invoices, totalCount] = await Promise.all([
      db.invoice.findMany({
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
          job: {
            select: {
              id: true,
              jobNumber: true,
              applianceType: true,
              applianceBrand: true,
            },
          },
          invoiceItems: true,
          payments: true,
          issuedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Create invoice
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can create invoices
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = invoiceCreateSchema.parse(body);

    // Check if job exists and doesn't already have an invoice
    const existingJob = await db.job.findUnique({
      where: { id: validatedData.jobId },
      include: { invoice: true },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    if (existingJob.invoice) {
      return NextResponse.json(
        { error: "Invoice already exists for this job" },
        { status: 400 }
      );
    }

    // Generate invoice number - use invoiceNumber field for ordering to ensure uniqueness
    const lastInvoice = await db.invoice.findFirst({
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

    // Ensure uniqueness by checking if this invoice number already exists
    let invoiceNumber = `INV-${nextNumber.toString().padStart(5, "0")}`;
    let existingInvoice = await db.invoice.findUnique({
      where: { invoiceNumber },
    });

    // If it exists, keep incrementing until we find a unique number
    while (existingInvoice) {
      nextNumber++;
      invoiceNumber = `INV-${nextNumber.toString().padStart(5, "0")}`;
      existingInvoice = await db.invoice.findUnique({
        where: { invoiceNumber },
      });
    }

    // Calculate totals
    const subtotal = validatedData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // Get tax rate from settings or use provided
    let taxRate = validatedData.taxRate || 0;
    if (!validatedData.taxRate) {
      const settings = await db.settings.findFirst();
      taxRate = settings?.taxRate || 0;
    }

    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = validatedData.discountAmount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create invoice with items in a transaction
    const invoice = await db.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          jobId: validatedData.jobId,
          customerId: validatedData.customerId,
          issuedById: session.user.id,
          status: "DRAFT",
          issueDate: new Date(),
          dueDate: new Date(validatedData.dueDate),
          subtotal,
          taxRate,
          taxAmount,
          discountAmount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          notes: validatedData.notes,
          paymentTerms: validatedData.paymentTerms,
        },
        include: {
          customer: true,
          job: true,
          issuedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create invoice items
      await tx.invoiceItem.createMany({
        data: validatedData.items.map((item) => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          itemType: item.itemType,
        })),
      });

      // Fetch the created items
      const invoiceItems = await tx.invoiceItem.findMany({
        where: { invoiceId: newInvoice.id },
      });

      return { ...newInvoice, invoiceItems };
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
