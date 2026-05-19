import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/shop - Public shop state consumed by the marketing website.
export async function GET(request: NextRequest) {
  try {
    const settings = await db.settings.findFirst({
      select: {
        shopMaintenanceMode: true,
        companyPhone: true,
        companyEmail: true,
      },
    });

    const maintenanceMode = settings?.shopMaintenanceMode ?? true;
    const requestOrigin = new URL(request.url).origin;
    const publicOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      requestOrigin;
    const toAbsoluteUrl = (path: string) =>
      path.startsWith("http://") || path.startsWith("https://")
        ? path
        : `${publicOrigin.replace(/\/$/, "")}${path}`;

    const products = maintenanceMode
      ? []
      : await db.shopProduct.findMany({
          where: { status: "PUBLISHED" },
          orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            title: true,
            slug: true,
            brand: true,
            deviceType: true,
            modelNumber: true,
            condition: true,
            price: true,
            description: true,
            warrantyNotes: true,
            featured: true,
            images: true,
            updatedAt: true,
          },
        });

    return NextResponse.json({
      maintenanceMode,
      comingSoon: maintenanceMode,
      contact: {
        phone: settings?.companyPhone || "+64 22 5460 660",
        email: settings?.companyEmail || "support@erepair.co.nz",
      },
      products: products.map((product) => ({
        ...product,
        images: product.images.map(toAbsoluteUrl),
      })),
    });
  } catch (error) {
    console.error("Error loading public shop state:", error);
    return NextResponse.json(
      {
        maintenanceMode: true,
        comingSoon: true,
        contact: {
          phone: "+64 22 5460 660",
          email: "support@erepair.co.nz",
        },
        products: [],
      },
      { status: 200 }
    );
  }
}
