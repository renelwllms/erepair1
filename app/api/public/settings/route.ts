import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDiagnosticFees } from "@/lib/diagnostic-fees";

export const dynamic = 'force-dynamic';

// GET /api/public/settings - Get public company settings (logo and name only)
export async function GET() {
  try {
    const settings = await db.settings.findFirst({
      select: {
        companyName: true,
        companyLogo: true,
        companyFavicon: true,
        companyEmail: true,
        companyPhone: true,
        companyAddress: true,
        termsAndConditions: true,
        diagnosticFees: true,
        diagnosticFeeDefaultOther: true,
        primaryColor: true,
      },
    });

    if (!settings) {
      return NextResponse.json(
        {
          companyName: "",
          companyLogo: null,
          companyFavicon: null,
          companyEmail: null,
          companyPhone: null,
          companyAddress: null,
          termsAndConditions: null,
          diagnosticFees: {},
          diagnosticFeeDefaultOther: null,
          primaryColor: "#2563eb",
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
        companyFavicon: settings.companyFavicon || "/favicon.png",
        companyEmail: settings.companyEmail || null,
        companyPhone: settings.companyPhone || null,
        companyAddress: settings.companyAddress || null,
        termsAndConditions: settings.termsAndConditions || null,
        diagnosticFees: parseDiagnosticFees(settings.diagnosticFees),
        diagnosticFeeDefaultOther:
          typeof settings.diagnosticFeeDefaultOther === "number"
            ? settings.diagnosticFeeDefaultOther
            : null,
        primaryColor: settings.primaryColor || "#2563eb",
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
