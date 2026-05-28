import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const shopProductSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  brand: z.string().optional(),
  deviceType: z.string().optional(),
  modelNumber: z.string().optional(),
  capacityKg: z.number().min(0).optional().nullable(),
  condition: z.string().optional(),
  price: z.number().min(0, "Price must be zero or more"),
  description: z.string().min(1, "Description is required"),
  warrantyNotes: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "ARCHIVED"]),
  featured: z.boolean().optional(),
  images: z.array(z.string()).optional(),
  internalNotes: z.string().optional(),
});

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const requireStaff = async () => {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!["ADMIN", "TECHNICIAN"].includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
};

const uniqueSlug = async (base: string, excludeId: string) => {
  let candidate = base || "refurbished-device";
  let suffix = 1;

  while (true) {
    const existing = await db.shopProduct.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const existing = await db.shopProduct.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Shop product not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = shopProductSchema.parse(body);
    const slug = await uniqueSlug(makeSlug(data.slug || data.title), params.id);
    const now = new Date();

    const product = await db.shopProduct.update({
      where: { id: params.id },
      data: {
        title: data.title,
        slug,
        brand: data.brand || null,
        deviceType: data.deviceType || null,
        modelNumber: data.modelNumber || null,
        capacityKg: typeof data.capacityKg === "number" ? data.capacityKg : null,
        condition: data.condition || null,
        price: data.price,
        description: data.description,
        warrantyNotes: data.warrantyNotes || null,
        status: data.status,
        featured: data.featured || false,
        images: data.images || [],
        internalNotes: data.internalNotes || null,
        publishedAt:
          data.status === "PUBLISHED" && existing.status !== "PUBLISHED"
            ? now
            : existing.publishedAt,
        reservedAt:
          data.status === "RESERVED" && existing.status !== "RESERVED"
            ? now
            : data.status === "RESERVED"
              ? existing.reservedAt
              : null,
        soldAt:
          data.status === "SOLD" && existing.status !== "SOLD"
            ? now
            : data.status === "SOLD"
              ? existing.soldAt
              : null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Error updating shop product:", error);
    return NextResponse.json({ error: "Failed to update shop product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    await db.shopProduct.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shop product:", error);
    return NextResponse.json({ error: "Failed to delete shop product" }, { status: 500 });
  }
}
