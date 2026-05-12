import { differenceInCalendarDays } from "date-fns";
import { db } from "./db";
import { sendEmail } from "./email";
import { emailLayout } from "./email-templates";

const DEFAULT_FIRST_REMINDER_DAYS = 1;
const DEFAULT_REMINDER_FREQUENCY_DAYS = 5;
const DEFAULT_MAX_REMINDERS = 5;
const ADMIN_FOLLOW_UP_EMAIL = "Support@erepair.co.nz";

interface QuoteReminderPolicy {
  firstReminderDays: number;
  frequencyDays: number;
  maxReminders: number;
}

async function getQuoteReminderPolicy(): Promise<QuoteReminderPolicy> {
  const settings = await db.settings.findFirst({
    select: {
      quoteReminderDays: true,
      quoteReminderFrequency: true,
      quoteMaxReminders: true,
    },
  });

  return {
    firstReminderDays: settings?.quoteReminderDays || DEFAULT_FIRST_REMINDER_DAYS,
    frequencyDays: settings?.quoteReminderFrequency || DEFAULT_REMINDER_FREQUENCY_DAYS,
    maxReminders: settings?.quoteMaxReminders || DEFAULT_MAX_REMINDERS,
  };
}

function buildCustomerReminderEmail(
  quote: any,
  policy: QuoteReminderPolicy,
  companyName: string,
  companyEmail?: string | null,
  companyPhone?: string | null
) {
  const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/quote/accept/${quote.id}`;
  const rejectLink = `${process.env.NEXT_PUBLIC_APP_URL}/quote/reject/${quote.id}`;
  const reminderNumber = quote.reminderCount + 1;

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Quote Reminder</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${quote.customer.firstName} ${quote.customer.lastName},
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 20px 0; border-radius: 6px;">
      <strong>Reminder ${reminderNumber} of ${policy.maxReminders}:</strong> We are still waiting for your approval for quote ${quote.quoteNumber}.
    </div>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Job Number:</strong> ${quote.job.jobNumber}</p>
      <p style="margin: 0 0 10px 0;"><strong>Appliance:</strong> ${quote.job.applianceBrand} ${quote.job.applianceType}</p>
      <p style="margin: 0 0 10px 0;"><strong>Quote Total:</strong> $${quote.totalAmount.toFixed(2)}</p>
      <p style="margin: 0;"><strong>Valid Until:</strong> ${new Date(quote.validUntil).toLocaleDateString()}</p>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      Please let us know if you would like to proceed. If you have questions, contact us and we will help.
    </p>
    <div style="margin: 28px 0; text-align: center;">
      <a href="${acceptLink}" style="display: inline-block; padding: 12px 28px; margin: 0 8px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Accept Quote
      </a>
      <a href="${rejectLink}" style="display: inline-block; padding: 12px 28px; margin: 0 8px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Decline Quote
      </a>
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
      If you have already responded, please disregard this message.
      ${companyEmail ? ` You can contact us at ${companyEmail}.` : ""}
      ${companyPhone ? ` Phone: ${companyPhone}.` : ""}
    </p>
  `;

  return {
    subject: `Reminder ${reminderNumber}/${policy.maxReminders}: Quote ${quote.quoteNumber} awaiting approval`,
    html: emailLayout(content, companyName),
    text: `
Quote Reminder ${reminderNumber} of ${policy.maxReminders}

Dear ${quote.customer.firstName} ${quote.customer.lastName},

We are still waiting for your approval for quote ${quote.quoteNumber}.
Job Number: ${quote.job.jobNumber}
Appliance: ${quote.job.applianceBrand} ${quote.job.applianceType}
Quote Total: $${quote.totalAmount.toFixed(2)}
Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}

Accept: ${acceptLink}
Decline: ${rejectLink}
    `.trim(),
  };
}

function buildAdminFollowUpEmail(quote: any, companyName: string, policy: QuoteReminderPolicy) {
  const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${quote.job.id}`;
  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Manual Follow-up Required</h2>
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Quote ${quote.quoteNumber} for job ${quote.job.jobNumber} has reached ${policy.maxReminders} automatic reminders with no customer authorization.
    </p>
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${quote.customer.firstName} ${quote.customer.lastName}</p>
      <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${quote.customer.email}</p>
      <p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${quote.customer.phone}</p>
      <p style="margin: 0 0 10px 0;"><strong>Appliance:</strong> ${quote.job.applianceBrand} ${quote.job.applianceType}</p>
      <p style="margin: 0 0 10px 0;"><strong>Total:</strong> $${quote.totalAmount.toFixed(2)}</p>
      <p style="margin: 0;"><strong>Reminder Count:</strong> ${quote.reminderCount}</p>
    </div>
    <p style="margin: 24px 0 0 0;">
      <a href="${jobUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Open Job
      </a>
    </p>
  `;

  return {
    subject: `Manual follow-up required: ${quote.job.jobNumber} awaiting quote approval`,
    html: emailLayout(content, companyName),
    text: `Manual follow-up required for ${quote.job.jobNumber}. Quote ${quote.quoteNumber} has reached ${policy.maxReminders} reminders. Open: ${jobUrl}`,
  };
}

async function notifyAdminForManualFollowUp(
  quote: any,
  companyName: string,
  policy: QuoteReminderPolicy
) {
  const email = buildAdminFollowUpEmail(quote, companyName, policy);
  await sendEmail({
    to: ADMIN_FOLLOW_UP_EMAIL,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: "QUOTE_ADMIN_FOLLOW_UP",
    relatedId: quote.id,
  });
}

export async function processSingleQuoteReminder(quote: any) {
  if (quote.status !== "SENT") {
    throw new Error("Reminders can only be sent for quotes with status 'SENT'");
  }

  if (new Date(quote.validUntil) < new Date()) {
    throw new Error("Cannot send reminder for expired quote");
  }

  const settings = await db.settings.findFirst();
  const policy = {
    firstReminderDays: settings?.quoteReminderDays || DEFAULT_FIRST_REMINDER_DAYS,
    frequencyDays: settings?.quoteReminderFrequency || DEFAULT_REMINDER_FREQUENCY_DAYS,
    maxReminders: settings?.quoteMaxReminders || DEFAULT_MAX_REMINDERS,
  };

  if (quote.reminderCount >= policy.maxReminders) {
    throw new Error(`Maximum of ${policy.maxReminders} reminders already sent`);
  }

  const companyName = settings?.companyName || "E-Repair Shop";
  const email = buildCustomerReminderEmail(
    quote,
    policy,
    companyName,
    settings?.companyEmail || settings?.smtpFromEmail || null,
    settings?.companyPhone || null
  );

  await sendEmail({
    to: quote.customer.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
    emailType: "QUOTE_REMINDER",
    relatedId: quote.id,
  });

  let updatedQuote = await db.quote.update({
    where: { id: quote.id },
    data: {
      lastReminderSent: new Date(),
      reminderCount: quote.reminderCount + 1,
    },
    include: {
      customer: true,
      job: true,
    },
  });

  if (updatedQuote.reminderCount >= policy.maxReminders && !(updatedQuote as any).adminFollowUpNotifiedAt) {
    await notifyAdminForManualFollowUp(updatedQuote, companyName, policy);
    updatedQuote = await db.quote.update({
      where: { id: quote.id },
      data: {
        adminFollowUpNotifiedAt: new Date(),
      },
      include: {
        customer: true,
        job: true,
      },
    });
  }

  return updatedQuote;
}

export async function processDueQuoteReminders() {
  const now = new Date();
  const policy = await getQuoteReminderPolicy();
  const dueQuotes = await db.quote.findMany({
    where: {
      status: "SENT",
      reminderCount: {
        lt: policy.maxReminders,
      },
      validUntil: {
        gte: now,
      },
      job: {
        status: "AWAITING_CUSTOMER_APPROVAL",
      },
    },
    include: {
      customer: true,
      job: true,
    },
  });

  let processed = 0;
  let adminEscalations = 0;
  const errors: string[] = [];

  for (const quote of dueQuotes) {
    const firstReminderDue =
      differenceInCalendarDays(now, new Date(quote.issueDate)) >= policy.firstReminderDays;
    const nextReminderDue =
      quote.lastReminderSent &&
      differenceInCalendarDays(now, new Date(quote.lastReminderSent)) >= policy.frequencyDays;
    const isDue = quote.reminderCount === 0 ? firstReminderDue : Boolean(nextReminderDue);

    if (!isDue) {
      continue;
    }

    try {
      const updatedQuote = await processSingleQuoteReminder(quote);
      processed += 1;
      if (updatedQuote.adminFollowUpNotifiedAt) {
        adminEscalations += 1;
      }
    } catch (error) {
      errors.push(`${quote.quoteNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return {
    checked: dueQuotes.length,
    processed,
    adminEscalations,
    errors,
    policy: {
      firstReminderDays: policy.firstReminderDays,
      frequencyDays: policy.frequencyDays,
      maxReminders: policy.maxReminders,
      adminEmail: ADMIN_FOLLOW_UP_EMAIL,
    },
  };
}
