import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/settings - Get public company settings (logo and name only)
export async function GET() {
  try {
    const settings = await db.settings.findFirst({
      select: {
        companyName: true,
        companyLogo: true,
      },
    });

    if (!settings) {
      return NextResponse.json(
        {
          companyName: "",
          companyLogo: null,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    return NextResponse.json(
      {
        companyName: settings.companyName || "",
        companyLogo: settings.companyLogo || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
