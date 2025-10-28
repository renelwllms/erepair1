import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testEmailConfig } from "@/lib/email";
import { z } from "zod";

// Validation schema
const testEmailSchema = z.object({
  testEmail: z.string().email("Invalid email address"),
});

// POST /api/settings/test-email - Send a test email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can test email
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validatedData = testEmailSchema.parse(body);

    // Test email configuration
    const result = await testEmailConfig(validatedData.testEmail);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    console.error("Error testing email:", error);
    return NextResponse.json(
      { success: false, message: "Failed to test email configuration" },
      { status: 500 }
    );
  }
}
