import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const contentTypeFor = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
};

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  const filename = decodeURIComponent(params.filename);

  if (!/^[a-zA-Z0-9._-]+\.(jpe?g|png|webp)$/i.test(filename)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "uploads", "shop", filename);
    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypeFor(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
