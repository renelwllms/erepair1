import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessInvoice } from "@/lib/access-control";
import { z } from "zod";

export const dynamic = "force-dynamic";

const refundCreateSchema = z.object({
  amount: z.number().min(0.01, "Refund amount must be greater than 0"),
  refundMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "OTHER"]),
  refundDate: z.string().datetime().optional(),
  reason: z.string().min(1, "Refund reason is required"),
  referenceNumber: z.string().optional(),
  payoutStatus: z.enum(["PENDING", "COMPLETED"]).default("COMPLETED"),
});

function calculateRefundSummary(invoice: any) {
  const totalPaid = Number(invoice.paidAmount || 0);
  const totalRefunded = invoice.refunds.reduce(
    (sum: number, refund: any) => sum + Number(refund.amount || 0),
    0
  );
  const nonRefundableDiagnosticFee =
    invoice.job?.diagnosticFeePaid && invoice.job?.diagnosticFeeAmount
      ? Number(invoice.job.diagnosticFeeAmount)
      : 0;
  const nonRefundableCalloutFee = invoice.job?.isCallout
    ? Number(invoice.job.calloutFee || 0)
    : 0;
  const refundableInvoiceAmount = Math.max(
    0,
    Number(invoice.totalAmount || 0) -
      nonRefundableDiagnosticFee -
      nonRefundableCalloutFee
  );

  const maximumRefundableAmount = Math.max(
    0,
    Math.min(totalPaid - totalRefunded, refundableInvoiceAmount - totalRefunded)
  );

  return {
    totalPaid,
    totalRefunded,
    nonRefundableDiagnosticFee,
    nonRefundableCalloutFee,
    refundableInvoiceAmount,
    maximumRefundableAmount,
  };
}

async function getInvoiceForRefund(invoiceId: string) {
  return (db as any).invoice.findUnique({
    where: { id: invoiceId },
      include: {
        invoiceItems: true,
        refunds: true,
      job: {
        select: {
          id: true,
          isCallout: true,
          calloutFee: true,
          diagnosticFeeAmount: true,
          diagnosticFeePaid: true,
        },
      },
    },
  });
}

// GET /api/invoices/[id]/refunds - Get refunds and suggested refundable summary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await canAccessInvoice(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invoice = await getInvoiceForRefund(params.id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      refunds: invoice.refunds.sort(
        (a: any, b: any) =>
          new Date(b.refundDate).getTime() - new Date(a.refundDate).getTime()
      ),
      summary: calculateRefundSummary(invoice),
    });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(
      { error: "Failed to fetch refunds" },
      { status: 500 }
    );
  }
}

// POST /api/invoices/[id]/refunds - Process refund
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

    if (!(await canAccessInvoice(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const validatedData = refundCreateSchema.parse(await request.json());
    const invoice = await getInvoiceForRefund(params.id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot refund a cancelled invoice" },
        { status: 400 }
      );
    }

    const summary = calculateRefundSummary(invoice);

    if (validatedData.amount > summary.maximumRefundableAmount) {
      return NextResponse.json(
        {
          error: `Refund amount cannot exceed maximum refundable amount of $${summary.maximumRefundableAmount.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const refund = await (db as any).refund.create({
      data: {
        invoiceId: params.id,
        amount: validatedData.amount,
        refundMethod: validatedData.refundMethod,
        refundDate: validatedData.refundDate
          ? new Date(validatedData.refundDate)
          : new Date(),
        reason: validatedData.reason,
        referenceNumber: validatedData.referenceNumber || null,
        payoutStatus: validatedData.payoutStatus,
        createdById: session.user.id,
      },
    });

    const updatedInvoice = await (db as any).invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        job: true,
        invoiceItems: true,
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

    return NextResponse.json({ refund, invoice: updatedInvoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating refund:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
