import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === "CUSTOMER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dbAny = db as any;
    const job = await dbAny.job.findFirst({
      where: {
        id: params.id,
        OR: [{ jobType: "CALLOUT_REPAIR" }, { isCallout: true }],
      },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Callout job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const photoCategory = String(formData.get("photoCategory") || "Before Repair");
    const caption = String(formData.get("caption") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required" }, { status: 400 });
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, or WebP photos are allowed" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${params.id}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "field-service");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/field-service/${filename}`;
    const photo = await dbAny.jobPhoto.create({
      data: {
        jobId: params.id,
        uploadedBy: session.user.id,
        photoCategory,
        fileUrl,
        caption: caption || null,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Error uploading field service photo:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
