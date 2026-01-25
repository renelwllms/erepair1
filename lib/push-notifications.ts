import webpush from 'web-push';
import { db } from './db';

// Initialize web push with VAPID details
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@erepair.co.nz',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
) {
  try {
    // Get all push subscriptions for this user
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send notification to all subscriptions
    const notifications = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          },
          JSON.stringify(payload)
        );
        console.log(`Push notification sent to subscription ${sub.id}`);
      } catch (error: any) {
        console.error(`Push notification error for subscription ${sub.id}:`, error);

        // If subscription is expired (410 Gone), delete it
        if (error.statusCode === 410) {
          console.log(`Deleting expired subscription ${sub.id}`);
          await db.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('Failed to send push notifications:', error);
  }
}

export async function sendJobStatusNotification(
  jobId: string,
  status: string,
  notes?: string
) {
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        customer: {
          include: { user: true }
        }
      }
    });

    if (!job?.customer?.user) {
      console.log(`No user found for job ${jobId}`);
      return;
    }

    const statusMessages: Record<string, string> = {
      IN_PROGRESS: 'Your repair is now in progress',
      AWAITING_PARTS: 'Waiting for parts to arrive',
      AWAITING_CUSTOMER_APPROVAL: 'Quote ready - approval needed',
      READY_FOR_PICKUP: 'Your item is ready for pickup!',
      CLOSED: 'Your repair has been completed',
    };

    const message = notes || statusMessages[status] || 'Status updated';

    await sendPushNotification(job.customer.user.id, {
      title: `Job ${job.jobNumber} Updated`,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        jobId: job.id,
        jobNumber: job.jobNumber,
        status,
        url: `/track-job?jobNumber=${job.jobNumber}`
      }
    });

    console.log(`Job status notification sent for job ${job.jobNumber}`);
  } catch (error) {
    console.error('Failed to send job status notification:', error);
  }
}

export async function sendQuoteNotification(
  quoteId: string,
  message: string
) {
  try {
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: {
          include: { user: true }
        }
      }
    });

    if (!quote?.customer?.user) {
      console.log(`No user found for quote ${quoteId}`);
      return;
    }

    await sendPushNotification(quote.customer.user.id, {
      title: `Quote ${quote.quoteNumber}`,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        url: `/quote/accept?id=${quote.id}`
      }
    });

    console.log(`Quote notification sent for quote ${quote.quoteNumber}`);
  } catch (error) {
    console.error('Failed to send quote notification:', error);
  }
}
