import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessQuote } from "@/lib/access-control";
import { processSingleQuoteReminder } from "@/lib/quote-reminders";

// POST /api/quotes/[id]/send-reminder - Send a reminder email for a quote
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and technicians can send reminders
    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await canAccessQuote(session.user, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the quote with all details
    const quote = await db.quote.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        job: {
          include: {
            customer: true,
          },
        },
        issuedBy: true,
        quoteItems: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const updatedQuote = await processSingleQuoteReminder(quote);

    return NextResponse.json({
      success: true,
      message: "Reminder email sent successfully",
      reminderCount: updatedQuote.reminderCount,
      lastReminderSent: updatedQuote.lastReminderSent,
    });
  } catch (error) {
    console.error("Error sending quote reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
