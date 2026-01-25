import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const subscription = await request.json();

    // Validate subscription object has required fields
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    // Upsert subscription - update if exists, create if new
    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session?.user?.id || null,
        userAgent: request.headers.get('user-agent') || undefined,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session?.user?.id || null,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    });

    console.log(`Push subscription saved for ${session?.user?.email || 'anonymous user'}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push subscription error:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint required" },
        { status: 400 }
      );
    }

    await db.pushSubscription.delete({
      where: { endpoint }
    });

    console.log(`Push subscription deleted for endpoint: ${endpoint}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // If subscription doesn't exist, that's fine
    if (error.code === 'P2025') {
      return NextResponse.json({ success: true });
    }

    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
