import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/search-customer?phone=XXX - Search customer by phone (no auth required)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone || phone.trim().length < 3) {
      return NextResponse.json(
        { error: "Phone number must be at least 3 characters" },
        { status: 400 }
      );
    }

    // Search for customer by phone
    const customer = await db.customer.findFirst({
      where: { phone: phone.trim() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (customer) {
      return NextResponse.json({
        found: true,
        customer,
      });
    } else {
      return NextResponse.json({
        found: false,
        message: "No customer found with this phone number",
      });
    }
  } catch (error) {
    console.error("Error searching customer:", error);
    return NextResponse.json(
      { error: "Failed to search customer" },
      { status: 500 }
    );
  }
}
