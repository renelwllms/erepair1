import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("favicon") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/png",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use ICO, PNG, or SVG" },
        { status: 400 }
      );
    }

    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 1MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "branding");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate filename
    const fileExtension = file.name.split(".").pop();
    const filename = `favicon-${Date.now()}.${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Return the public path
    const publicPath = `/uploads/branding/${filename}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
    });
  } catch (error) {
    console.error("Favicon upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload favicon" },
      { status: 500 }
    );
  }
}
