import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/public/shop - Public shop state consumed by the marketing website.
export async function GET() {
  try {
    const settings = await db.settings.findFirst({
      select: {
        shopMaintenanceMode: true,
        companyPhone: true,
        companyEmail: true,
      },
    });

    const maintenanceMode = settings?.shopMaintenanceMode ?? true;

    return NextResponse.json({
      maintenanceMode,
      comingSoon: maintenanceMode,
      contact: {
        phone: settings?.companyPhone || "+64 22 5460 660",
        email: settings?.companyEmail || "support@erepair.co.nz",
      },
      products: [],
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
