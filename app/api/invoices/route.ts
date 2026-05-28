import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { withInvoiceAccessScope } from "@/lib/access-control";
import { buildDiagnosticCreditItem } from "@/lib/diagnostic-fees";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number(),
  itemType: z.enum(["PART", "LABOR", "SERVICE_FEE", "TAX", "DISCOUNT"]),
}).superRefine((item, ctx) => {
  if (item.itemType === "DISCOUNT") {
    if (item.unitPrice > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitPrice"],
        message: "Discount items must use a negative amount",
      });
    }
    return;
  }

  if (item.unitPrice < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["unitPrice"],
      message: "Only discount items can use a negative amount",
    });
  }
});

// Validation schema for invoice creation
const invoiceCreateSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  dueDate: z.string().datetime(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  taxRate: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
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
    let where: any = {};

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

    where = withInvoiceAccessScope(where, session.user);

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
          refunds: true,
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

    const actor = await resolveActiveStaffUser(session);
    if (!actor || !actor.isActive) {
      return NextResponse.json(
        { error: "Your login session is out of sync with the user record. Please sign out and sign in again." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validatedData = invoiceCreateSchema.parse(body);

    // Check if job exists and doesn't already have an invoice
    const existingJob = (await db.job.findUnique({
      where: { id: validatedData.jobId },
      include: { invoice: true },
    })) as any;

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

    const hasDiagnosticCreditItem = validatedData.items.some((item) =>
      item.itemType === "DISCOUNT" &&
      item.description === "Diagnostic Fee (credited)" &&
      item.quantity === 1 &&
      Number(item.unitPrice) === -Math.abs(existingJob.diagnosticFeeAmount || 0)
    );

    const shouldApplyDiagnosticFee =
      existingJob.diagnosticFeeAmount > 0 &&
      existingJob.diagnosticFeePaid &&
      !existingJob.diagnosticFeeAppliedToInvoice &&
      !hasDiagnosticCreditItem;

    const invoiceItems = [
      ...validatedData.items,
      ...(shouldApplyDiagnosticFee ? [buildDiagnosticCreditItem(existingJob.diagnosticFeeAmount)] : []),
    ];

    // Calculate totals
    const subtotal = invoiceItems.reduce(
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
    const invoice = await db.$transaction(async (tx: any) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          jobId: validatedData.jobId,
          customerId: existingJob.customerId,
          issuedById: actor.id,
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
        data: invoiceItems.map((item) => ({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          itemType: item.itemType,
        })),
      });

      if (shouldApplyDiagnosticFee) {
        const txAny = tx as any;
        await txAny.job.update({
          where: { id: existingJob.id },
          data: {
            diagnosticFeeAppliedToInvoice: true,
            repairApproved: true,
          },
        });
      }

      // Fetch the created items
      const createdItems = await tx.invoiceItem.findMany({
        where: { invoiceId: newInvoice.id },
      });

      return { ...newInvoice, invoiceItems: createdItems };
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
