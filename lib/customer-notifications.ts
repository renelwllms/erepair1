import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { emailLayout } from "@/lib/email-templates";
import { formatFieldStatus } from "@/lib/field-service";

type NotificationJob = {
  id: string;
  jobNumber: string;
  applianceBrand?: string | null;
  applianceType?: string | null;
  issueDescription?: string | null;
  status?: string | null;
  scheduledTime?: Date | string | null;
  preferredCalloutDate?: Date | string | null;
  calloutAddress?: string | null;
  customer: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  assignedTechnician?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

const escapeHtml = (value?: string | null) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDateTime = (value?: Date | string | null) => {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-NZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildTechnicianUpdateEmail = async (
  job: NotificationJob,
  notificationType: string,
  message: string
) => {
  const settings = await db.settings.findFirst({
    select: { companyName: true },
  });
  const companyName = settings?.companyName || "E-Repair Shop";
  const customerName = [job.customer.firstName, job.customer.lastName].filter(Boolean).join(" ") || "Customer";
  const appliance = [job.applianceBrand, job.applianceType].filter(Boolean).join(" ") || "Appliance repair";
  const technician = job.assignedTechnician
    ? [job.assignedTechnician.firstName, job.assignedTechnician.lastName].filter(Boolean).join(" ")
    : "";
  const statusLabel = notificationType === "TECHNICIAN_ON_THE_WAY" ? "Technician On The Way" : formatFieldStatus(job.status);
  const scheduledTime = job.scheduledTime || job.preferredCalloutDate;

  const detailRows = [
    ["Job Number", job.jobNumber],
    ["Appliance", appliance],
    ["Issue", job.issueDescription || "Not specified"],
    ["Address", job.calloutAddress || "Not specified"],
    ["Scheduled Time", formatDateTime(scheduledTime)],
    ["Status", statusLabel],
    ...(technician ? [["Technician", technician]] : []),
  ];

  const content = `
    <h2 style="color: #1f2937; margin: 0 0 20px 0;">
      Technician Update
    </h2>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear ${escapeHtml(customerName)},
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      ${escapeHtml(message)}
    </p>

    <div style="background-color: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
      <p style="color: #1e40af; font-size: 14px; margin: 0 0 5px 0; font-weight: bold;">
        Current Update
      </p>
      <p style="color: #1e3a8a; font-size: 28px; margin: 0; font-weight: bold;">
        ${escapeHtml(statusLabel)}
      </p>
    </div>

    <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 16px;">Job Details</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 24px 0;">
      ${detailRows
        .map(
          ([label, value]) => `
            <tr>
              <td style="border-bottom: 1px solid #e5e7eb; padding: 10px 0; color: #6b7280; font-size: 14px; width: 38%;">
                ${escapeHtml(label)}
              </td>
              <td style="border-bottom: 1px solid #e5e7eb; padding: 10px 0; color: #111827; font-size: 14px; font-weight: 600;">
                ${escapeHtml(value)}
              </td>
            </tr>
          `
        )
        .join("")}
    </table>

    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
      We will keep you updated as the callout progresses.
    </p>
  `;

  const text = `
Technician Update - ${companyName}

Dear ${customerName},

${message}

Current Update: ${statusLabel}

Job Details
${detailRows.map(([label, value]) => `${label}: ${value}`).join("\n")}

We will keep you updated as the callout progresses.
  `;

  return {
    subject: `Technician Update - ${job.jobNumber}`,
    html: emailLayout(content, companyName),
    text,
  };
};

export async function sendCustomerNotificationEmail({
  notificationId,
  job,
  notificationType,
  message,
  sentById,
}: {
  notificationId: string;
  job: NotificationJob;
  notificationType: string;
  message: string;
  sentById?: string | null;
}) {
  const dbAny = db as any;
  const recipient = job.customer.email;

  if (!recipient) {
    await dbAny.customerNotification.update({
      where: { id: notificationId },
      data: { status: "FAILED" },
    });
    throw new Error("Customer has no email address for notifications");
  }

  try {
    const email = await buildTechnicianUpdateEmail(job, notificationType, message);
    await sendEmail({
      to: recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      emailType: notificationType,
      relatedId: job.id,
      sentById: sentById || undefined,
    });

    const sentAt = new Date();
    await Promise.all([
      dbAny.customerNotification.update({
        where: { id: notificationId },
        data: { status: "SENT", sentAt, queuedUntil: null },
      }),
      dbAny.job.update({
        where: { id: job.id },
        data: { customerNotificationSentAt: sentAt },
      }),
    ]);
  } catch (error) {
    await dbAny.customerNotification.update({
      where: { id: notificationId },
      data: { status: "FAILED", sentAt: null },
    });
    throw error;
  }
}

export async function processDueQueuedCustomerNotifications(limit = 25) {
  const dbAny = db as any;
  const dueNotifications = await dbAny.customerNotification.findMany({
    where: {
      status: "QUEUED",
      queuedUntil: { lte: new Date() },
    },
    include: {
      job: {
        include: { customer: true, assignedTechnician: true },
      },
    },
    orderBy: { queuedUntil: "asc" },
    take: limit,
  });

  const results = await Promise.allSettled(
    dueNotifications.map((notification: any) =>
      sendCustomerNotificationEmail({
        notificationId: notification.id,
        job: notification.job,
        notificationType: notification.notificationType,
        message: notification.message,
        sentById: notification.createdBy,
      })
    )
  );

  return {
    processed: dueNotifications.length,
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}
