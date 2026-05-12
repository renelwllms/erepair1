import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

type NotificationJob = {
  id: string;
  jobNumber: string;
  customer: {
    email?: string | null;
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
    await sendEmail({
      to: recipient,
      subject: `Technician update for ${job.jobNumber}`,
      html: `<p>${message}</p>`,
      text: message,
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
        include: { customer: true },
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
