import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const partSchema = z.object({
  partNumber: z.string().min(1, "Part number is required"),
  sku: z.string().optional().nullable(),
  partName: z.string().min(1, "Part name is required"),
  description: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  costPrice: z.number().min(0, "Cost price must be zero or more"),
  sellingPrice: z.number().min(0, "Selling price must be zero or more"),
  quantityInStock: z.number().int().min(0, "Stock cannot be negative"),
  reorderLevel: z.number().int().min(0, "Reorder level cannot be negative"),
  reorderQuantity: z.number().int().min(0, "Reorder quantity cannot be negative"),
});

async function requireStaff() {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!["ADMIN", "TECHNICIAN"].includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const existing = await db.part.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const data = partSchema.parse(await request.json());
    const partNumber = data.partNumber.trim();
    const sku = normalizeOptional(data.sku);

    const partNumberOwner = await db.part.findUnique({ where: { partNumber } });
    if (partNumberOwner && partNumberOwner.id !== params.id) {
      return NextResponse.json({ error: "Part number already exists" }, { status: 400 });
    }

    if (sku) {
      const skuOwner = await db.part.findUnique({ where: { sku } });
      if (skuOwner && skuOwner.id !== params.id) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
      }
    }

    const part = await db.part.update({
      where: { id: params.id },
      data: {
        partNumber,
        sku,
        partName: data.partName.trim(),
        description: normalizeOptional(data.description),
        supplier: normalizeOptional(data.supplier),
        location: normalizeOptional(data.location),
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantityInStock: data.quantityInStock,
        reorderLevel: data.reorderLevel,
        reorderQuantity: data.reorderQuantity,
      },
    });

    return NextResponse.json(part);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error updating part:", error);
    return NextResponse.json({ error: "Failed to update part" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const existing = await db.part.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            jobParts: true,
            invoiceItems: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    if (existing._count.jobParts > 0 || existing._count.invoiceItems > 0) {
      return NextResponse.json(
        { error: "Cannot delete a part that has job or invoice history" },
        { status: 400 }
      );
    }

    await db.part.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Part deleted successfully" });
  } catch (error) {
    console.error("Error deleting part:", error);
    return NextResponse.json({ error: "Failed to delete part" }, { status: 500 });
  }
}
