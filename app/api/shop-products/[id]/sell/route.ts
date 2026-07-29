import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const sellProductSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  dueDate: z.string().datetime(),
  taxRate: z.number().min(0).max(100).optional(),
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

async function generateInvoiceNumber() {
  const lastInvoice = await db.invoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  let invoiceNumber = `INV-${nextNumber.toString().padStart(5, "0")}`;
  let existingInvoice = await db.invoice.findUnique({
    where: { invoiceNumber },
  });

  while (existingInvoice) {
    nextNumber += 1;
    invoiceNumber = `INV-${nextNumber.toString().padStart(5, "0")}`;
    existingInvoice = await db.invoice.findUnique({
      where: { invoiceNumber },
    });
  }

  return invoiceNumber;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const data = sellProductSchema.parse(body);

    const [product, customer, settings] = await Promise.all([
      db.shopProduct.findUnique({ where: { id } }),
      db.customer.findUnique({ where: { id: data.customerId }, select: { id: true } }),
      db.settings.findFirst(),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Shop product not found" }, { status: 404 });
    }

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (product.status === "SOLD") {
      return NextResponse.json({ error: "This product is already sold" }, { status: 400 });
    }

    if (product.status === "ARCHIVED") {
      return NextResponse.json({ error: "Archived products cannot be sold" }, { status: 400 });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const taxRate = data.taxRate ?? settings?.taxRate ?? 0;
    const subtotal = product.price;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const lineDescription = [
      product.title,
      product.brand,
      product.deviceType,
      product.modelNumber,
    ].filter(Boolean).join(" - ");

    const result = await db.$transaction(async (tx: any) => {
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          jobId: null,
          customerId: data.customerId,
          issuedById: actor.id,
          status: "DRAFT",
          issueDate: new Date(),
          dueDate: new Date(data.dueDate),
          subtotal,
          taxRate,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          notes: data.notes,
          paymentTerms: data.paymentTerms || "Payment due upon collection of the product",
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

      await tx.invoiceItem.create({
        data: {
          invoiceId: newInvoice.id,
          partId: null,
          description: lineDescription || product.title,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
          itemType: "PART",
        },
      });

      const soldProduct = await tx.shopProduct.update({
        where: { id: product.id },
        data: {
          status: "SOLD",
          featured: false,
          reservedAt: null,
          soldAt: new Date(),
          internalNotes: [
            product.internalNotes,
            `Sold via invoice ${invoiceNumber}`,
          ].filter(Boolean).join("\n"),
        },
      });

      const invoiceItems = await tx.invoiceItem.findMany({
        where: { invoiceId: newInvoice.id },
      });

      return { invoice: { ...newInvoice, invoiceItems }, product: soldProduct };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Error selling shop product:", error);
    return NextResponse.json({ error: "Failed to sell shop product" }, { status: 500 });
  }
}
