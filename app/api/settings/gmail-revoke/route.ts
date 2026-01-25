import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revokeGmailAccess } from "@/lib/gmail-oauth";

export const dynamic = "force-dynamic";

/**
 * POST /api/settings/gmail-revoke
 * Revoke Gmail OAuth access
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await revokeGmailAccess();

    return NextResponse.json({ success: true, message: "Gmail access revoked successfully" });
  } catch (error: any) {
    console.error("Error revoking Gmail access:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke access" },
      { status: 500 }
    );
  }
}
