import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processDueQuoteReminders } from "@/lib/quote-reminders";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const internalToken = request.headers.get("x-reminder-token");
    const expectedToken = process.env.REMINDER_PROCESSOR_TOKEN || "";
    const isInternalCall = Boolean(expectedToken) && internalToken === expectedToken;

    if (!isInternalCall) {
      const session = await auth();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await processDueQuoteReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error processing due quote reminders:", error);
    return NextResponse.json({ error: "Failed to process quote reminders" }, { status: 500 });
  }
}
