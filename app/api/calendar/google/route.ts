import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createGmailOAuth2Client } from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";

const parseDateParam = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await db.settings.findFirst();
    const connected =
      Boolean(settings?.googleClientId) &&
      Boolean(settings?.googleClientSecret) &&
      Boolean(settings?.googleRefreshToken);

    if (!connected) {
      return NextResponse.json({
        connected: false,
        events: [],
        message: "Google Workspace is not connected.",
      });
    }

    const now = new Date();
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 30);

    const { searchParams } = new URL(request.url);
    const start = parseDateParam(searchParams.get("start"), now);
    const end = parseDateParam(searchParams.get("end"), defaultEnd);

    const oauth2Client = await createGmailOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = (response.data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || "(No title)",
      description: event.description || "",
      location: event.location || "",
      htmlLink: event.htmlLink || "",
      start: event.start?.dateTime || event.start?.date || null,
      end: event.end?.dateTime || event.end?.date || null,
      allDay: Boolean(event.start?.date),
      status: event.status || "",
    }));

    return NextResponse.json({
      connected: true,
      events,
    });
  } catch (error: any) {
    const details = error?.errors?.[0]?.message || error?.message || "Failed to fetch Google Calendar events";
    const reason = error?.errors?.[0]?.reason;
    const status = error?.code === 403 || error?.status === 403 ? 403 : 500;

    console.error("Error fetching Google Calendar events:", error);

    return NextResponse.json(
      {
        connected: true,
        events: [],
        error: details,
        needsReauthorization:
          status === 403 &&
          (reason === "insufficientPermissions" ||
            /insufficient|scope|permission/i.test(details)),
      },
      { status }
    );
  }
}
