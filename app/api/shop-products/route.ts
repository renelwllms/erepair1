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
  condition: z.string().optional(),
  price: z.number().min(0, "Price must be zero or more"),
  description: z.string().min(1, "Description is required"),
  warrantyNotes: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "ARCHIVED"]).default("DRAFT"),
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

const uniqueSlug = async (base: string, excludeId?: string) => {
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

export async function GET(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const where: any = {};
    if (status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { deviceType: { contains: search, mode: "insensitive" } },
        { modelNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await db.shopProduct.findMany({
      where,
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching shop products:", error);
    return NextResponse.json({ error: "Failed to fetch shop products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (guard.error) return guard.error;

    const body = await request.json();
    const data = shopProductSchema.parse(body);
    const statusChangedAt = data.status === "PUBLISHED" ? new Date() : null;
    const slug = await uniqueSlug(makeSlug(data.slug || data.title));

    const product = await db.shopProduct.create({
      data: {
        title: data.title,
        slug,
        brand: data.brand || null,
        deviceType: data.deviceType || null,
        modelNumber: data.modelNumber || null,
        condition: data.condition || null,
        price: data.price,
        description: data.description,
        warrantyNotes: data.warrantyNotes || null,
        status: data.status,
        featured: data.featured || false,
        images: data.images || [],
        internalNotes: data.internalNotes || null,
        publishedAt: statusChangedAt,
        reservedAt: data.status === "RESERVED" ? new Date() : null,
        soldAt: data.status === "SOLD" ? new Date() : null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Error creating shop product:", error);
    return NextResponse.json({ error: "Failed to create shop product" }, { status: 500 });
  }
}
