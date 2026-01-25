import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

    // Persist favicon path to settings so it applies immediately
    const settings = await db.settings.findFirst();
    if (settings) {
      await db.settings.update({
        where: { id: settings.id },
        data: { companyFavicon: publicPath },
      });
    } else {
      await db.settings.create({ data: { companyFavicon: publicPath } });
    }

    return NextResponse.json({
      success: true,
      path: publicPath,
      saved: true,
    });
  } catch (error) {
    console.error("Favicon upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload favicon" },
      { status: 500 }
    );
  }
}
