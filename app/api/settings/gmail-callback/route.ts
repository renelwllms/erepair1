import { NextRequest, NextResponse } from "next/server";
import { exchangeGmailCode } from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings/gmail-callback
 * Handle Gmail OAuth callback and exchange code for tokens
 */
export async function GET(request: NextRequest) {
  try {
    // Use NEXTAUTH_URL for all URLs (more reliable than request origin with reverse proxies)
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?gmail_error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?gmail_error=no_code", baseUrl)
      );
    }

    const redirectUri = `${baseUrl}/api/settings/gmail-callback`;

    console.log("Gmail Callback - Base URL:", baseUrl);
    console.log("Gmail Callback - Redirect URI:", redirectUri);

    // Exchange code for tokens
    await exchangeGmailCode(code, redirectUri);

    // Redirect back to settings with success message
    return NextResponse.redirect(
      new URL("/settings?gmail_success=true", baseUrl)
    );
  } catch (error: any) {
    console.error("Error in Gmail OAuth callback:", error);
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL(
        `/settings?gmail_error=${encodeURIComponent(error.message || "Authentication failed")}`,
        baseUrl
      )
    );
  }
}
