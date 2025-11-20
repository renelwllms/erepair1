import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

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

    // Check if quote is in a state that allows reminders
    if (quote.status !== "SENT") {
      return NextResponse.json(
        { error: "Reminders can only be sent for quotes with status 'SENT'" },
        { status: 400 }
      );
    }

    // Check if quote is expired
    if (new Date(quote.validUntil) < new Date()) {
      return NextResponse.json(
        { error: "Cannot send reminder for expired quote" },
        { status: 400 }
      );
    }

    // Get settings to check max reminders
    const settings = await db.settings.findFirst();
    const maxReminders = settings?.quoteMaxReminders || 3;

    // Check if max reminders reached
    if (quote.reminderCount >= maxReminders) {
      return NextResponse.json(
        { error: `Maximum of ${maxReminders} reminders already sent` },
        { status: 400 }
      );
    }

    // Get company settings for email
    const companyName = settings?.companyName || "E-Repair Shop";
    const companyEmail = settings?.companyEmail || "";
    const companyPhone = settings?.companyPhone || "";

    // Prepare email content
    const subject = `Reminder: Quote ${quote.quoteNumber} - Awaiting Your Response`;

    const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/quote/accept/${quote.id}`;
    const rejectLink = `${process.env.NEXT_PUBLIC_APP_URL}/quote/reject/${quote.id}`;

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .quote-details { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .total { font-size: 24px; color: #2563eb; font-weight: bold; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
    .button-accept { background-color: #10b981; color: white; }
    .button-reject { background-color: #ef4444; color: white; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    .urgency { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Quote Reminder</h1>
    </div>

    <div class="content">
      <p>Dear ${quote.customer.firstName} ${quote.customer.lastName},</p>

      <div class="urgency">
        <strong>⏰ Friendly Reminder:</strong> We haven't heard back from you regarding the quote we sent for your ${quote.job.applianceType} repair.
      </div>

      <p>We wanted to follow up on the quote we provided for your repair request:</p>

      <div class="quote-details">
        <div class="detail-row">
          <span class="detail-label">Quote Number:</span>
          <span>${quote.quoteNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Job Number:</span>
          <span>${quote.job.jobNumber}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Appliance:</span>
          <span>${quote.job.applianceBrand} ${quote.job.applianceType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Quote Total:</span>
          <span class="total">$${quote.totalAmount.toFixed(2)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Valid Until:</span>
          <span>${new Date(quote.validUntil).toLocaleDateString()}</span>
        </div>
      </div>

      <p><strong>Please let us know if you'd like to proceed with the repair or if you have any questions.</strong></p>

      <div class="button-container">
        <a href="${acceptLink}" class="button button-accept">✓ Accept Quote</a>
        <a href="${rejectLink}" class="button button-reject">✗ Decline Quote</a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        If you've already responded, please disregard this reminder. If you have any questions about the quote, feel free to contact us.
      </p>
    </div>

    <div class="footer">
      <p><strong>${companyName}</strong></p>
      ${companyEmail ? `<p>Email: ${companyEmail}</p>` : ""}
      ${companyPhone ? `<p>Phone: ${companyPhone}</p>` : ""}
      <p style="margin-top: 20px;">This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send the reminder email
    const emailResult = await sendEmail({
      to: quote.customer.email,
      subject,
      html: emailBody,
      emailType: "QUOTE_REMINDER",
      relatedId: quote.id,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send reminder email" },
        { status: 500 }
      );
    }

    // Update the quote with reminder tracking
    const updatedQuote = await db.quote.update({
      where: { id: params.id },
      data: {
        lastReminderSent: new Date(),
        reminderCount: quote.reminderCount + 1,
      },
    });

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
