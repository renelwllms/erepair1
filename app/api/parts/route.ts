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

export async function GET(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const stock = searchParams.get("stock") || "all";

    const where: any = {};
    if (search) {
      where.OR = [
        { partNumber: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { partName: { contains: search, mode: "insensitive" } },
        { supplier: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const parts = await db.part.findMany({
      where,
      include: {
        _count: {
          select: {
            jobParts: true,
            invoiceItems: true,
          },
        },
      },
      orderBy: [{ partName: "asc" }, { partNumber: "asc" }],
    });

    const filteredParts = stock === "low"
      ? parts.filter((part) => part.quantityInStock <= part.reorderLevel)
      : stock === "out"
        ? parts.filter((part) => part.quantityInStock === 0)
        : parts;

    return NextResponse.json({
      parts: filteredParts,
      summary: {
        total: parts.length,
        lowStock: parts.filter((part) => part.quantityInStock <= part.reorderLevel).length,
        outOfStock: parts.filter((part) => part.quantityInStock === 0).length,
      },
    });
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json({ error: "Failed to fetch parts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const data = partSchema.parse(await request.json());
    const partNumber = data.partNumber.trim();
    const sku = normalizeOptional(data.sku);

    const existingPartNumber = await db.part.findUnique({ where: { partNumber } });
    if (existingPartNumber) {
      return NextResponse.json({ error: "Part number already exists" }, { status: 400 });
    }

    if (sku) {
      const existingSku = await db.part.findUnique({ where: { sku } });
      if (existingSku) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
      }
    }

    const part = await db.part.create({
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

    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error creating part:", error);
    return NextResponse.json({ error: "Failed to create part" }, { status: 500 });
  }
}
