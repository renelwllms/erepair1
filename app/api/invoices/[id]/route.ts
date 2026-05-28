import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessInvoice } from "@/lib/access-control";
import { z } from "zod";

export const dynamic = 'force-dynamic';

// Validation schema for invoice update
const invoiceUpdateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    totalPrice: z.number(),
    itemType: z.string(),
  })).optional(),
  subtotal: z.number().optional(),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
  discountAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  balanceAmount: z.number().optional(),
});

// GET /api/invoices/[id] - Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await (db as any).invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        job: {
          include: {
            assignedTechnician: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        invoiceItems: {
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
        refunds: {
          orderBy: { refundDate: "desc" },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!(await canAccessInvoice(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id] - Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can update invoices
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = invoiceUpdateSchema.parse(body);

    // Check if invoice exists
    const existingInvoice = await db.invoice.findUnique({
      where: { id: params.id },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!(await canAccessInvoice(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing DRAFT invoices for item/amount changes
    if (validatedData.items && existingInvoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only edit items on draft invoices" },
        { status: 400 }
      );
    }

    // Prevent editing paid invoices unless changing to cancelled
    if (existingInvoice.status === "PAID" && validatedData.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot edit a paid invoice" },
        { status: 400 }
      );
    }

    // If items are provided, delete old items and create new ones
    if (validatedData.items) {
      // Delete existing items
      await db.invoiceItem.deleteMany({
        where: { invoiceId: params.id },
      });

      // Create new items
      await db.invoiceItem.createMany({
        data: validatedData.items.map(item => ({
          invoiceId: params.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          itemType: item.itemType,
        })),
      });
    }

    // Update invoice
    const updateData: any = {
      status: validatedData.status,
      notes: validatedData.notes,
      paymentTerms: validatedData.paymentTerms,
    };

    if (validatedData.dueDate) {
      updateData.dueDate = new Date(validatedData.dueDate);
    }

    if (validatedData.subtotal !== undefined) updateData.subtotal = validatedData.subtotal;
    if (validatedData.taxRate !== undefined) updateData.taxRate = validatedData.taxRate;
    if (validatedData.taxAmount !== undefined) updateData.taxAmount = validatedData.taxAmount;
    if (validatedData.discountAmount !== undefined) updateData.discountAmount = validatedData.discountAmount;
    if (validatedData.totalAmount !== undefined) updateData.totalAmount = validatedData.totalAmount;
    if (validatedData.balanceAmount !== undefined) updateData.balanceAmount = validatedData.balanceAmount;

    const invoice = await (db as any).invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        job: true,
        invoiceItems: true,
        payments: true,
        refunds: {
          orderBy: { refundDate: "desc" },
        },
        issuedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id] - Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete invoices
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if invoice exists
    const existingInvoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: { payments: true },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Prevent deleting invoices with payments
    if (existingInvoice.payments.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete invoice with payments" },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      // If this invoice applied the diagnostic fee credit, allow it to be used again on recreation.
      if (existingInvoice.jobId) {
        const job = await tx.job.findUnique({
          where: { id: existingInvoice.jobId },
          select: {
            id: true,
            diagnosticFeeAppliedToInvoice: true,
            diagnosticFeePaid: true,
          },
        });

        if (job?.diagnosticFeeAppliedToInvoice) {
          await tx.job.update({
            where: { id: job.id },
            data: {
              diagnosticFeeAppliedToInvoice: false,
            },
          });
        }
      }

      // Delete invoice (cascade deletes invoice items)
      await tx.invoice.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
