import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["ADMIN", "TECHNICIAN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and WebP images are allowed" }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 8MB" }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads", "shop");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `shop-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = join(uploadsDir, filename);
    const bytes = await file.arrayBuffer();

    await writeFile(filepath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      path: `/uploads/shop/${filename}`,
    });
  } catch (error) {
    console.error("Error uploading shop product image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
