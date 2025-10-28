import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Validation schema for payment creation
const paymentCreateSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "CHECK", "OTHER"]),
  paymentDate: z.string().datetime().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/invoices/[id]/payments - Get payments for an invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payments = await db.payment.findMany({
      where: { invoiceId: params.id },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/invoices/[id]/payments - Add payment to invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and TECHNICIAN can add payments
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = paymentCreateSchema.parse(body);

    // Check if invoice exists
    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Check if invoice is cancelled
    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot add payment to cancelled invoice" },
        { status: 400 }
      );
    }

    // Validate payment amount doesn't exceed balance
    if (validatedData.amount > invoice.balanceAmount) {
      return NextResponse.json(
        { error: `Payment amount cannot exceed balance of $${invoice.balanceAmount.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create payment and update invoice in transaction
    const result = await db.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          invoiceId: params.id,
          amount: validatedData.amount,
          paymentMethod: validatedData.paymentMethod,
          paymentDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date(),
          referenceNumber: validatedData.referenceNumber,
          notes: validatedData.notes,
        },
      });

      // Calculate new paid amount and balance
      const newPaidAmount = invoice.paidAmount + validatedData.amount;
      const newBalanceAmount = invoice.totalAmount - newPaidAmount;

      // Determine new status
      let newStatus = invoice.status;
      if (newBalanceAmount === 0) {
        newStatus = "PAID";
      } else if (newBalanceAmount < invoice.totalAmount && newBalanceAmount > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: params.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
        include: {
          customer: true,
          job: true,
          invoiceItems: true,
          payments: {
            orderBy: { paymentDate: "desc" },
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

      return { payment, invoice: updatedInvoice };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
