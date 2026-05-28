import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateGmailAuthUrl } from "@/lib/gmail-oauth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/gmail-auth
 * Generate Gmail OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use NEXTAUTH_URL for the redirect URI (more reliable than request origin with reverse proxies)
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/settings/gmail-callback`;
    const requestedReturnTo = request.nextUrl.searchParams.get("returnTo") || "/settings";
    const returnTo = requestedReturnTo.startsWith("/") ? requestedReturnTo : "/settings";

    console.log("Gmail Auth - Base URL:", baseUrl);
    console.log("Gmail Auth - Redirect URI:", redirectUri);

    const state = crypto.randomUUID();
    const authUrl = await generateGmailAuthUrl(redirectUri, state);
    const response = NextResponse.json({ authUrl });

    response.cookies.set("gmail_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    response.cookies.set("gmail_oauth_return_to", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error: any) {
    console.error("Error generating Gmail auth URL:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
