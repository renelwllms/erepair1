import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/settings/database - Get current database connection info
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse DATABASE_URL from environment
    const databaseUrl = process.env.DATABASE_URL || "";

    let dbInfo = {
      type: "PostgreSQL",
      host: "",
      port: "",
      database: "",
      username: "",
      connected: false,
    };

    try {
      // Parse PostgreSQL connection string
      // Format: postgresql://username:password@host:port/database
      const url = new URL(databaseUrl);

      dbInfo = {
        type: "PostgreSQL",
        host: url.hostname,
        port: url.port || "5432",
        database: url.pathname.split("/")[1]?.split("?")[0] || "",
        username: url.username,
        connected: true,
      };
    } catch (error) {
      console.error("Failed to parse DATABASE_URL:", error);
    }

    return NextResponse.json(dbInfo);
  } catch (error) {
    console.error("Error fetching database info:", error);
    return NextResponse.json(
      { error: "Failed to fetch database info" },
      { status: 500 }
    );
  }
}

// POST /api/settings/database/test - Test database connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await import("@/lib/db");

    // Try to query the database
    try {
      await db.$queryRaw`SELECT 1`;
      return NextResponse.json({
        success: true,
        message: "Database connection successful",
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          error: error.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error testing database connection:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to test database connection",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
