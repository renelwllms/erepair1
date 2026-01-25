import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodeAddress, detectCalloutLocation } from "@/lib/geocoding";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter required" },
        { status: 400 }
      );
    }

    // Get settings for API key and locations
    const settings = await db.settings.findFirst();

    if (!settings?.geocodingApiKey) {
      return NextResponse.json(
        { error: "Geocoding service not configured" },
        { status: 500 }
      );
    }

    // Geocode the address
    const result = await geocodeAddress(address, settings.geocodingApiKey);

    if (!result) {
      return NextResponse.json(
        { error: "Address not found or invalid" },
        { status: 404 }
      );
    }

    // Detect callout location if configured
    let calloutLocation = null;
    let calloutFee = null;

    if (settings.calloutLocations) {
      try {
        const locations = JSON.parse(settings.calloutLocations);
        const detected = detectCalloutLocation(result.lat, result.lng, locations);

        if (detected) {
          calloutLocation = detected.name;
          calloutFee = detected.fee;
        }
      } catch (error) {
        console.error("Error parsing callout locations:", error);
      }
    }

    return NextResponse.json({
      ...result,
      calloutLocation,
      calloutFee,
    });

  } catch (error: any) {
    console.error("Geocoding API error:", error);
    return NextResponse.json(
      { error: "Failed to geocode address" },
      { status: 500 }
    );
  }
}
